import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { parse, serialize } from "cookie";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

const router = Router();
const SESSION_COOKIE = "portopedia_session";
const SESSION_TTL_MS = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS
};

const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  username: z.string().trim().toLowerCase().min(3).max(30).regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/, "Use 3–30 letters, numbers, underscores or hyphens."),
  displayName: z.string().trim().min(2).max(80),
  password: z.string().min(12).max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128)
});

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function setSessionCookie(response: Response, token: string) {
  response.append("Set-Cookie", serialize(SESSION_COOKIE, token, cookieOptions));
}

function clearSessionCookie(response: Response) {
  response.append("Set-Cookie", serialize(SESSION_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
    expires: new Date(0)
  }));
}

function readSessionToken(request: Request): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  return parse(header)[SESSION_COOKIE];
}

function assertTrustedOrigin(request: Request, response: Response): boolean {
  const origin = request.get("origin");
  if (origin && origin !== env.WEB_ORIGIN) {
    response.status(403).json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed." } });
    return false;
  }
  return true;
}

async function issueSession(userId: string, response: Response) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  });
  setSessionCookie(response, token);
}

export type AuthenticatedRequest = Request & {
  authUser: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: "USER" | "ADMIN";
  };
};

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const token = readSessionToken(request);
    if (!token || token.length > 128) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { id: true, email: true, username: true, displayName: true, role: true } } }
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      clearSessionCookie(response);
      response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
      return;
    }

    (request as AuthenticatedRequest).authUser = session.user;
    void prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
    next();
  } catch (error) {
    next(error);
  }
}

router.post("/register", async (request, response, next) => {
  if (!assertTrustedOrigin(request, response)) return;
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Check the submitted account details.", details: parsed.error.flatten().fieldErrors } });
    return;
  }

  try {
    const { email, username, displayName, password } = parsed.data;
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1
    });

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          username,
          displayName,
          passwordHash,
          portfolio: { create: { title: displayName } }
        },
        select: { id: true, email: true, username: true, displayName: true, role: true }
      });
      return created;
    });

    await issueSession(user.id, response);
    response.status(201).json({ user });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      response.status(409).json({ error: { code: "ACCOUNT_CONFLICT", message: "An account with those details already exists." } });
      return;
    }
    next(error);
  }
});

router.post("/login", async (request, response, next) => {
  if (!assertTrustedOrigin(request, response)) return;
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Enter a valid email and password." } });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, email: true, username: true, displayName: true, role: true, passwordHash: true }
    });

    const valid = user?.passwordHash
      ? await argon2.verify(user.passwordHash, parsed.data.password).catch(() => false)
      : false;

    if (!user || !valid) {
      response.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
      return;
    }

    await issueSession(user.id, response);
    response.status(200).json({
      user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (request, response) => {
  const user = (request as AuthenticatedRequest).authUser;
  response.status(200).json({ user });
});

router.post("/logout", async (request, response, next) => {
  if (!assertTrustedOrigin(request, response)) return;
  try {
    const token = readSessionToken(request);
    if (token && token.length <= 128) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
    clearSessionCookie(response);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

export const authRouter = router;
