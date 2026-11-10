import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireAuth } from "./auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/overview", async (_request, response, next) => {
  try {
    const now = new Date();
    const [users, portfolios, publicPortfolios, projects, publicProjects, assets, activeSessions] = await Promise.all([
      prisma.user.count(),
      prisma.portfolio.count(),
      prisma.portfolio.count({ where: { visibility: "PUBLIC", publishedAt: { not: null } } }),
      prisma.project.count(),
      prisma.project.count({ where: { visibility: "PUBLIC", publishedAt: { not: null } } }),
      prisma.asset.count(),
      prisma.session.count({ where: { expiresAt: { gt: now } } })
    ]);
    response.status(200).json({
      metrics: { users, portfolios, publicPortfolios, projects, publicProjects, assets, activeSessions }
    });
  } catch (error) { next(error); }
});

router.get("/users", async (request, response, next) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    q: z.string().trim().max(100).optional()
  }).safeParse(request.query);
  if (!query.success) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid user filters." } });
    return;
  }
  try {
    const { page, limit, q } = query.data;
    const where = q ? {
      OR: [
        { email: { contains: q, mode: "insensitive" as const } },
        { username: { contains: q, mode: "insensitive" as const } },
        { displayName: { contains: q, mode: "insensitive" as const } }
      ]
    } : {};
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, displayName: true,
          role: true, emailVerifiedAt: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ]);
    response.status(200).json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) { next(error); }
});

export const adminRouter = router;
