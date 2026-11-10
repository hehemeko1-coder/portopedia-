import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(env.API_PORT, () => {
  console.info(`Portopedia API listening on port ${env.API_PORT}`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Received ${signal}; shutting down gracefully.`);

  server.close(async (error) => {
    try {
      await prisma.$disconnect();
      if (error) {
        console.error("HTTP server shutdown failed.", error);
        process.exitCode = 1;
      }
    } catch (disconnectError) {
      console.error("Database disconnect failed.", disconnectError);
      process.exitCode = 1;
    }
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
