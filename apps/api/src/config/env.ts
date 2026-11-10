import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().default("http://localhost:4000/api/v1/auth/google/callback"),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional()),
  BREVO_SENDER_NAME: z.string().default("Portopedia")
}).superRefine((config, context) => {
  if (config.NODE_ENV === "production" && !process.env.WEB_ORIGIN) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["WEB_ORIGIN"], message: "WEB_ORIGIN must be explicitly configured in production." });
  }

  const r2Settings = [config.R2_ACCOUNT_ID, config.R2_ACCESS_KEY_ID, config.R2_SECRET_ACCESS_KEY, config.R2_BUCKET_NAME];
  if (r2Settings.some(Boolean) && !r2Settings.every(Boolean)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["R2_ACCOUNT_ID"], message: "Configure all R2 account, key, secret and bucket values together." });
  }
  if (config.NODE_ENV === "production" && r2Settings.every(Boolean) && !config.R2_PUBLIC_BASE_URL) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["R2_PUBLIC_BASE_URL"], message: "Set the public asset domain when enabling production R2 uploads." });
  }

  const googleSettings = [config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET];
  if (googleSettings.some(Boolean) && !googleSettings.every(Boolean)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["GOOGLE_CLIENT_ID"], message: "Configure both Google OAuth client ID and secret." });
  }
  if (config.NODE_ENV === "production" && googleSettings.every(Boolean) && new URL(config.GOOGLE_CALLBACK_URL).hostname === "localhost") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["GOOGLE_CALLBACK_URL"], message: "Set the deployed API callback URL for production Google OAuth." });
  }

  const emailSettings = [config.BREVO_API_KEY, config.BREVO_SENDER_EMAIL];
  if (emailSettings.some(Boolean) && !emailSettings.every(Boolean)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["BREVO_API_KEY"], message: "Configure both the Brevo API key and verified sender email." });
  }
});

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;
