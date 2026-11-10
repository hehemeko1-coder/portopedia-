import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "./auth.js";

const router = Router();

const createProjectSchema = z.object({
  title: z.string().trim().min(2).max(120),
  summary: z.string().trim().max(500).optional(),
  description: z.string().trim().max(10000).optional()
}).strict();

const updateProjectSchema = createProjectSchema.partial().extend({
  visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional()
}).strict();

function toSlug(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "project";
}

router.get("/", requireAuth, async (request, response, next) => {
  const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    q: z.string().trim().max(100).optional(),
    sort: z.enum(["newest", "oldest", "title"]).default("newest")
  });
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid project filters." } });
    return;
  }

  try {
    const user = (request as AuthenticatedRequest).authUser;
    const { page, limit, q, sort } = parsed.data;
    const where = {
      portfolio: { userId: user.id },
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { summary: { contains: q, mode: "insensitive" as const } }] } : {})
    };
    const orderBy = sort === "oldest" ? { createdAt: "asc" as const } : sort === "title" ? { title: "asc" as const } : { createdAt: "desc" as const };
    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      prisma.project.count({ where })
    ]);
    response.status(200).json({
      projects,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (request, response, next) => {
  const parsed = createProjectSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Check the project details.", details: parsed.error.flatten().fieldErrors } });
    return;
  }
  try {
    const user = (request as AuthenticatedRequest).authUser;
    const portfolio = await prisma.portfolio.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!portfolio) {
      response.status(404).json({ error: { code: "PORTFOLIO_NOT_FOUND", message: "Portfolio not found." } });
      return;
    }
    const baseSlug = toSlug(parsed.data.title);
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
    const project = await prisma.project.create({
      data: { ...parsed.data, slug, portfolioId: portfolio.id }
    });
    response.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireAuth, async (request, response, next) => {
  const id = z.string().min(1).max(64).safeParse(request.params.id);
  const parsed = updateProjectSchema.safeParse(request.body);
  if (!id.success || !parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provide a valid project ID and at least one valid field." } });
    return;
  }
  try {
    const user = (request as AuthenticatedRequest).authUser;
    const owned = await prisma.project.findFirst({
      where: { id: id.data, portfolio: { userId: user.id } },
      select: { id: true, publishedAt: true }
    });
    if (!owned) {
      response.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } });
      return;
    }
    const data = {
      ...parsed.data,
      ...(parsed.data.visibility === "PUBLIC" ? { publishedAt: owned.publishedAt ?? new Date() } : {}),
      ...(parsed.data.visibility === "PRIVATE" ? { publishedAt: null } : {})
    };
    const project = await prisma.project.update({ where: { id: owned.id }, data });
    response.status(200).json({ project });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, async (request, response, next) => {
  const id = z.string().min(1).max(64).safeParse(request.params.id);
  if (!id.success) {
    response.status(400).json({ error: { code: "INVALID_PROJECT_ID", message: "Invalid project ID." } });
    return;
  }
  try {
    const user = (request as AuthenticatedRequest).authUser;
    const owned = await prisma.project.findFirst({
      where: { id: id.data, portfolio: { userId: user.id } },
      select: { id: true }
    });
    if (!owned) {
      response.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } });
      return;
    }
    await prisma.project.delete({ where: { id: owned.id } });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

export const projectRouter = router;
