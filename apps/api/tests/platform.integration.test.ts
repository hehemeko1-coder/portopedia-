import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";

const { sendTransactionalEmail } = vi.hoisted(() => ({
  sendTransactionalEmail: vi.fn()
}));

vi.mock("../src/lib/email.js", () => ({
  isEmailDeliveryConfigured: true,
  sendTransactionalEmail
}));

import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

let server: Server;
let baseUrl = "";

type SentEmail = { textContent: string };

function emailToken(): string {
  const message = sendTransactionalEmail.mock.calls.at(-1)?.[0] as SentEmail | undefined;
  if (!message) throw new Error("The expected transactional email was not sent.");
  const match = message.textContent.match(/https?:\/\/\S+/);
  if (!match) throw new Error("The email did not contain a verification or recovery link.");
  const token = new URL(match[0]).searchParams.get("token");
  if (!token) throw new Error("The email link did not contain a token.");
  return token;
}

function headers(ip: string, cookie?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Forwarded-For": ip,
    ...(cookie ? { Cookie: cookie } : {})
  };
}

async function post(path: string, body: unknown, ip: string, cookie?: string) {
  return fetch(baseUrl + path, {
    method: "POST",
    headers: headers(ip, cookie),
    body: JSON.stringify(body)
  });
}

async function createVerifiedUser(email: string, username: string, ip: string) {
  const password = "correct-horse-battery-staple";
  const registration = await post("/api/v1/auth/register", {
    email, username, displayName: "Test Creator", password
  }, ip);
  expect(registration.status).toBe(201);
  const token = emailToken();
  const verification = await post("/api/v1/auth/verify-email", { token }, ip);
  expect(verification.status).toBe(200);
  const cookie = verification.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Verification did not establish a session cookie.");
  const result = await verification.json() as { user: { id: string; email: string; username: string } };
  return { user: result.user, cookie, password };
}

describe("identity, ownership and publishing integration", () => {
  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test API did not bind to a TCP port.");
    baseUrl = "http://127.0.0.1:" + address.port;
  });

  beforeEach(async () => {
    sendTransactionalEmail.mockReset();
    sendTransactionalEmail.mockResolvedValue(undefined);
    await prisma.user.updateMany({ data: { avatarAssetId: null } });
    await prisma.project.updateMany({ data: { coverAssetId: null } });
    await prisma.asset.deleteMany();
    await prisma.project.deleteMany();
    await prisma.portfolio.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await prisma.$disconnect();
  });

  it("verifies new accounts before granting a secure session", async () => {
    const registration = await post("/api/v1/auth/register", {
      email: "verify@example.com",
      username: "verify-creator",
      displayName: "Verify Creator",
      password: "correct-horse-battery-staple"
    }, "198.51.100.11");

    expect(registration.status).toBe(201);
    expect(registration.headers.get("set-cookie")).toBeNull();
    const prematureLogin = await post("/api/v1/auth/login", { email: "verify@example.com", password: "correct-horse-battery-staple" }, "198.51.100.11");
    expect(prematureLogin.status).toBe(403);
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);

    const verification = await post("/api/v1/auth/verify-email", { token: emailToken() }, "198.51.100.11");
    expect(verification.status).toBe(200);
    expect(verification.headers.get("set-cookie")).toContain("portopedia_session=");
    const result = await verification.json() as { user: { email: string } };
    expect(result.user.email).toBe("verify@example.com");
  });

  it("allows a verified creator to sign in and revoke their session", async () => {
    const account = await createVerifiedUser("login@example.com", "login-creator", "198.51.100.12");
    const login = await post("/api/v1/auth/login", {
      email: account.user.email,
      password: account.password
    }, "198.51.100.12");

    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toContain("portopedia_session=");

    const current = await fetch(baseUrl + "/api/v1/auth/me", { headers: { Cookie: cookie! } });
    expect(current.status).toBe(200);

    const logout = await post("/api/v1/auth/logout", {}, "198.51.100.12", cookie);
    expect(logout.status).toBe(204);

    const afterLogout = await fetch(baseUrl + "/api/v1/auth/me", { headers: { Cookie: cookie! } });
    expect(afterLogout.status).toBe(401);
  });

  it("revokes existing sessions after a password reset", async () => {
    const account = await createVerifiedUser("reset@example.com", "reset-creator", "198.51.100.13");
    const request = await post("/api/v1/auth/password-reset/request", { email: account.user.email }, "198.51.100.13");
    expect(request.status).toBe(200);
    const resetToken = emailToken();

    const reset = await post("/api/v1/auth/password-reset/confirm", {
      token: resetToken,
      password: "a-new-secure-password-456"
    }, "198.51.100.13");
    expect(reset.status).toBe(200);
    const reusedToken = await post("/api/v1/auth/password-reset/confirm", { token: resetToken, password: "another-secure-password-789" }, "198.51.100.13");
    expect(reusedToken.status).toBe(400);

    const oldSession = await fetch(baseUrl + "/api/v1/auth/me", { headers: { Cookie: account.cookie } });
    expect(oldSession.status).toBe(401);

    const login = await post("/api/v1/auth/login", {
      email: account.user.email,
      password: "a-new-secure-password-456"
    }, "198.51.100.13");
    expect(login.status).toBe(200);
  });

  it("enforces project ownership and publishes only explicitly public projects", async () => {
    const owner = await createVerifiedUser("owner@example.com", "portfolio-owner", "198.51.100.14");
    const outsider = await createVerifiedUser("outsider@example.com", "portfolio-outsider", "198.51.100.15");

    const privateCreate = await post("/api/v1/projects", {
      title: "Private concept",
      summary: "Not for public viewing"
    }, "198.51.100.14", owner.cookie);
    expect(privateCreate.status).toBe(201);
    const privateProject = (await privateCreate.json() as { project: { id: string } }).project;

    const publicCreate = await post("/api/v1/projects", {
      title: "Published work",
      summary: "Visible to visitors"
    }, "198.51.100.14", owner.cookie);
    expect(publicCreate.status).toBe(201);
    const publicProject = (await publicCreate.json() as { project: { id: string } }).project;

    const forbiddenUpdate = await fetch(baseUrl + "/api/v1/projects/" + privateProject.id, {
      method: "PATCH",
      headers: headers("198.51.100.15", outsider.cookie),
      body: JSON.stringify({ title: "Unauthorized edit" })
    });
    expect(forbiddenUpdate.status).toBe(404);

    const crossOriginPublish = await fetch(baseUrl + "/api/v1/portfolios/publish", {
      method: "POST",
      headers: { ...headers("198.51.100.14", owner.cookie), Origin: "https://untrusted.example" },
      body: "{}"
    });
    expect(crossOriginPublish.status).toBe(403);

    const publishProject = await fetch(baseUrl + "/api/v1/projects/" + publicProject.id, {
      method: "PATCH",
      headers: headers("198.51.100.14", owner.cookie),
      body: JSON.stringify({ visibility: "PUBLIC" })
    });
    expect(publishProject.status).toBe(200);

    const publishPortfolio = await post("/api/v1/portfolios/publish", {}, "198.51.100.14", owner.cookie);
    expect(publishPortfolio.status).toBe(200);

    const publicPage = await fetch(baseUrl + "/api/v1/portfolios/" + owner.user.username);
    expect(publicPage.status).toBe(200);
    const result = await publicPage.json() as { portfolio: { projects: Array<{ id: string }> } };
    expect(result.portfolio.projects.map((project) => project.id)).toEqual([publicProject.id]);
  });

  it("restricts administrator metrics to accounts with the administrator role", async () => {
    const regular = await createVerifiedUser("regular@example.com", "regular-creator", "198.51.100.17");
    const denied = await fetch(baseUrl + "/api/v1/admin/overview", { headers: { Cookie: regular.cookie } });
    expect(denied.status).toBe(403);

    const account = await createVerifiedUser("admin@example.com", "admin-creator", "198.51.100.16");
    await prisma.user.update({ where: { id: account.user.id }, data: { role: "ADMIN" } });
    const response = await fetch(baseUrl + "/api/v1/admin/overview", { headers: { Cookie: account.cookie } });
    expect(response.status).toBe(200);
    const result = await response.json() as { metrics: { users: number } };
    expect(result.metrics.users).toBeGreaterThanOrEqual(1);
  });
});
