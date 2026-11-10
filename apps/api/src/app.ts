import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { logger } from "./lib/logger.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { authRouter } from "./routes/auth.js";
import { portfolioRouter } from "./routes/portfolios.js";
import { projectRouter } from "./routes/projects.js";
import { assetRouter } from "./routes/assets.js";
import { adminRouter } from "./routes/admin.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin: env.WEB_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"]
}));
app.use((request, response, next) => {
  const startedAt = process.hrtime.bigint();
  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info({ method: request.method, path: request.path, statusCode: response.statusCode, durationMs }, "HTTP request");
  });
  next();
});
app.use(express.json({ limit: "1mb", strict: true }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } }
}));

app.get("/health/live", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.get("/health/ready", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.status(200).json({ status: "ready", checks: { database: "connected" } });
  } catch {
    response.status(503).json({ status: "not_ready", checks: { database: "unavailable" } });
  }
});

const api = express.Router();
api.get("/", (_request, response) => {
  response.status(200).json({
    name: "Portopedia API",
    version: "1",
    documentation: "https://github.com/hehemeko1-coder/portopedia-/blob/main/docs/API.md"
  });
});
api.use("/auth", authRouter);
api.use("/portfolios", portfolioRouter);
api.use("/projects", projectRouter);
api.use("/assets", assetRouter);
api.use("/admin", adminRouter);
app.use("/api/v1", api);

app.use((_request, response) => {
  response.status(404).json({
    error: { code: "NOT_FOUND", message: "The requested resource was not found." }
  });
});

const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  logger.error({ err: error, method: request.method, path: request.path }, "Unhandled request error");
  if (response.headersSent) return;
  response.status(500).json({
    error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." }
  });
};
app.use(errorHandler);
