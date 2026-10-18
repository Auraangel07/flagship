import { env } from "./env";
import { app } from "./app";
import { prisma } from "./lib/prisma";
import { closeAllClients } from "./lib/events";
import { logger } from "./lib/logger";

const server = app.listen(env.PORT, () => console.log(`Flagship API on :${env.PORT}`));

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  closeAllClients();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));