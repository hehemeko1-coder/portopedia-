import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from "file-type";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { isObjectStorageConfigured, publicAssetUrl, r2Client } from "../lib/storage.js";
import { requireAuth, requireTrustedOrigin, type AuthenticatedRequest } from "./auth.js";

const router = Router();
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/gif", "gif"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["application/pdf", "pdf"]
]);
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const presignSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE),
  projectId: z.string().min(1).max(64).optional()
}).strict();

router.use(requireTrustedOrigin, requireAuth);

router.post("/presign", async (request, response, next) => {
  const parsed = presignSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Check the file details.", details: parsed.error.flatten().fieldErrors } });
    return;
  }
  if (!isObjectStorageConfigured || !r2Client || !env.R2_BUCKET_NAME) {
    response.status(503).json({ error: { code: "STORAGE_NOT_CONFIGURED", message: "File storage is not configured on this deployment." } });
    return;
  }

  const extension = allowedTypes.get(parsed.data.mimeType);
  if (!extension) {
    response.status(415).json({ error: { code: "UNSUPPORTED_FILE_TYPE", message: "Upload a JPG, PNG, WebP, AVIF, GIF, MP4, WebM or PDF file." } });
    return;
  }

  try {
    const user = (request as unknown as AuthenticatedRequest).authUser;
    if (parsed.data.projectId) {
      const ownedProject = await prisma.project.findFirst({
        where: { id: parsed.data.projectId, portfolio: { userId: user.id } },
        select: { id: true }
      });
      if (!ownedProject) {
        response.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } });
        return;
      }
    }

    const storageKey = `${user.id}/${randomUUID()}.${extension}`;
    const asset = await prisma.asset.create({
      data: {
        ownerId: user.id,
        projectId: parsed.data.projectId,
        storageKey,
        originalName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        sizeBytes: BigInt(parsed.data.sizeBytes)
      },
      select: { id: true, storageKey: true, originalName: true, mimeType: true, sizeBytes: true, status: true }
    });

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: storageKey,
      ContentType: parsed.data.mimeType,
      ContentLength: parsed.data.sizeBytes,
    });
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
    response.status(201).json({
      asset: { ...asset, sizeBytes: asset.sizeBytes.toString() },
      uploadUrl,
      expiresInSeconds: 300,
      publicUrl: null
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/complete", async (request, response, next) => {
  const id = z.string().min(1).max(64).safeParse(request.params.id);
  if (!id.success) {
    response.status(400).json({ error: { code: "INVALID_ASSET_ID", message: "Invalid asset ID." } });
    return;
  }
  if (!isObjectStorageConfigured || !r2Client || !env.R2_BUCKET_NAME) {
    response.status(503).json({ error: { code: "STORAGE_NOT_CONFIGURED", message: "File storage is not configured on this deployment." } });
    return;
  }

  try {
    const user = (request as unknown as AuthenticatedRequest).authUser;
    const asset = await prisma.asset.findFirst({ where: { id: id.data, ownerId: user.id } });
    if (!asset) {
      response.status(404).json({ error: { code: "ASSET_NOT_FOUND", message: "Asset not found." } });
      return;
    }
    const head = await r2Client.send(new HeadObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: asset.storageKey
    }));
    const sample = await r2Client.send(new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: asset.storageKey,
      Range: "bytes=0-8191"
    }));
    const sampleBytes = sample.Body ? await sample.Body.transformToByteArray() : new Uint8Array();
    const detectedType = await fileTypeFromBuffer(sampleBytes);
    if (
      head.ContentLength !== Number(asset.sizeBytes) ||
      head.ContentType !== asset.mimeType ||
      detectedType?.mime !== asset.mimeType
    ) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: asset.storageKey }));
      await prisma.asset.update({ where: { id: asset.id }, data: { status: "FAILED" } });
      response.status(422).json({ error: { code: "UPLOAD_VERIFICATION_FAILED", message: "Uploaded file content does not match the authorized file type or size." } });
      return;
    }
    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: { status: "READY" },
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true, status: true, storageKey: true }
    });
    response.status(200).json({
      asset: { ...updated, sizeBytes: updated.sizeBytes.toString(), url: publicAssetUrl(updated.storageKey) }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (request, response, next) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  }).safeParse(request.query);
  if (!query.success) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid pagination values." } });
    return;
  }
  try {
    const user = (request as unknown as AuthenticatedRequest).authUser;
    const { page, limit } = query.data;
    const [assets, total] = await prisma.$transaction([
      prisma.asset.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.asset.count({ where: { ownerId: user.id } })
    ]);
    response.status(200).json({
      assets: assets.map((asset) => ({
        ...asset,
        sizeBytes: asset.sizeBytes.toString(),
        url: asset.status === "READY" ? publicAssetUrl(asset.storageKey) : null
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (request, response, next) => {
  const id = z.string().min(1).max(64).safeParse(request.params.id);
  if (!id.success) {
    response.status(400).json({ error: { code: "INVALID_ASSET_ID", message: "Invalid asset ID." } });
    return;
  }
  try {
    const user = (request as unknown as AuthenticatedRequest).authUser;
    const asset = await prisma.asset.findFirst({ where: { id: id.data, ownerId: user.id } });
    if (!asset) {
      response.status(404).json({ error: { code: "ASSET_NOT_FOUND", message: "Asset not found." } });
      return;
    }
    if (!isObjectStorageConfigured || !r2Client || !env.R2_BUCKET_NAME) {
      response.status(503).json({ error: { code: "STORAGE_NOT_CONFIGURED", message: "File storage must be available before deleting this asset." } });
      return;
    }
    await r2Client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: asset.storageKey }));
    await prisma.asset.delete({ where: { id: asset.id } });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

export const assetRouter = router;
