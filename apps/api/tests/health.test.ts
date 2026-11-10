import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { app } from "../src/app.js";

describe("HTTP application", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not bind to a TCP port.");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  it("reports process liveness without requiring a database connection", async () => {
    const response = await fetch(`${baseUrl}/health/live`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("rejects unauthenticated access to private portfolio and project resources", async () => {
    const portfolioResponse = await fetch(`${baseUrl}/api/v1/portfolios/me`);
    const projectResponse = await fetch(`${baseUrl}/api/v1/projects`);
    expect(portfolioResponse.status).toBe(401);
    expect(projectResponse.status).toBe(401);
  });

  it("validates login payloads before attempting database access", async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "" })
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" }
    });
  });

  it("rejects cross-origin authentication mutations", async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "https://attacker.example" },
      body: JSON.stringify({ email: "creator@example.com", username: "creator", displayName: "Creator", password: "a-secure-password-123" })
    });
    expect(response.status).toBe(403);
  });

  it("requires configured credentials before starting Google sign-in", async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/google`);
    expect(response.status).toBe(503);
  });

  it("rejects malformed verification tokens before database access", async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "short" })
    });
    expect(response.status).toBe(400);
  });

  it("rejects unauthenticated asset access", async () => {
    const response = await fetch(`${baseUrl}/api/v1/assets`);
    expect(response.status).toBe(401);
  });

  it("returns a consistent not-found response for unknown routes", async () => {
    const response = await fetch(`${baseUrl}/api/v1/not-a-route`);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "NOT_FOUND", message: "The requested resource was not found." }
    });
  });
});
