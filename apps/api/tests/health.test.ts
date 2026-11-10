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

  it("returns a consistent not-found response for unknown routes", async () => {
    const response = await fetch(`${baseUrl}/api/v1/not-a-route`);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "NOT_FOUND", message: "The requested resource was not found." }
    });
  });
});
