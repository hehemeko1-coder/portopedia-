import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

const configured = Boolean(
  env.R2_ACCOUNT_ID &&
  env.R2_ACCESS_KEY_ID &&
  env.R2_SECRET_ACCESS_KEY &&
  env.R2_BUCKET_NAME
);

export const isObjectStorageConfigured = configured;

export const r2Client = configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!
      }
    })
  : null;

export function publicAssetUrl(storageKey: string): string | null {
  if (!env.R2_PUBLIC_BASE_URL) return null;
  const encodedKey = storageKey.split("/").map(encodeURIComponent).join("/");
  return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${encodedKey}`;
}
