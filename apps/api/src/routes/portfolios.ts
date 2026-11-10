import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "./auth.js";

const router = Router();

const updatePortfolioSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  headline: z.string().trim().max(160).nullable().optional(),
  biography: z.string().trim().max(5000).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  websiteUrl: z.string().trim().url().max(2048).nullable().optional()
}).strict();

router.get("/me", requireAuth, async (request, response, next) => {
  try {
    const user = (request as AuthenticatedRequest).authUser;
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId: user.id },
      include: {
        projects: { orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }
      }
    });
    if (!portfolio) {
      response.status(404).json({ error: { code: "PORTFOLIO_NOT_FOUND", message: "Portfolio not found." } });
      return;
    }
    response.status(200).json({ portfolio });
  } catch (error) {
    next(error);
  }
});

router.patch("/me", requireAuth, async (request, response, next) => {
  const parsed = updatePortfolioSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Check the portfolio details.", details: parsed.error.flatten().fieldErrors } });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    response.status(400).json({ error: { code: "EMPTY_UPDATE", message: "Provide at least one field to update." } });
    return;
  }

  try {
    const user = (request as AuthenticatedRequest).authUser;
    const portfolio = await prisma.portfolio.update({
      where: { userId: user.id },
      data: parsed.data
    });
    response.status(200).json({ portfolio });
  } catch (error) {
    next(error);
  }
});

router.post("/publish", requireAuth, async (request, response, next) => {
  try {
    const user = (request as AuthenticatedRequest).authUser;
    const portfolio = await prisma.portfolio.findUnique({ where: { userId: user.id } });
    if (!portfolio) {
      response.status(404).json({ error: { code: "PORTFOLIO_NOT_FOUND", message: "Portfolio not found." } });
      return;
    }
    const published = await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: { visibility: "PUBLIC", publishedAt: portfolio.publishedAt ?? new Date() }
    });
    response.status(200).json({ portfolio: published });
  } catch (error) {
    next(error);
  }
});

router.post("/unpublish", requireAuth, async (request, response, next) => {
  try {
    const user = (request as AuthenticatedRequest).authUser;
    const portfolio = await prisma.portfolio.update({
      where: { userId: user.id },
      data: { visibility: "PRIVATE", publishedAt: null }
    });
    response.status(200).json({ portfolio });
  } catch (error) {
    next(error);
  }
});

router.get("/:username", async (request, response, next) => {
  try {
    const username = z.string().min(3).max(30).safeParse(request.params.username);
    if (!username.success) {
      response.status(404).json({ error: { code: "PORTFOLIO_NOT_FOUND", message: "Portfolio not found." } });
      return;
    }
    const portfolio = await prisma.portfolio.findFirst({
      where: {
        visibility: "PUBLIC",
        publishedAt: { not: null },
        user: { username: username.data }
      },
      select: {
        id: true,
        title: true,
        headline: true,
        biography: true,
        location: true,
        websiteUrl: true,
        publishedAt: true,
        updatedAt: true,
        user: { select: { username: true, displayName: true, avatarAsset: { select: { storageKey: true } } } },
        projects: {
          where: { visibility: "PUBLIC", publishedAt: { not: null } },
          orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            description: true,
            publishedAt: true,
            coverAsset: { select: { storageKey: true } }
          }
        }
      }
    });
    if (!portfolio) {
      response.status(404).json({ error: { code: "PORTFOLIO_NOT_FOUND", message: "Portfolio not found." } });
      return;
    }
    response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    response.status(200).json({ portfolio });
  } catch (error) {
    next(error);
  }
});

export const portfolioRouter = router;
