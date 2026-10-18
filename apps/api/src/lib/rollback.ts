import { prisma } from "./prisma";
import { invalidate } from "./cache";
import { broadcast } from "./events";
import { logger } from "./logger";

export const ROLLBACK = {
  windowMs: 5 * 60 * 1000,
  minExposures: 20,
  errorRate: 0.05,
};

// Returns true if the flag was rolled back.
export async function checkRollback(environmentId: string, flagKey: string): Promise<boolean> {
  const since = new Date(Date.now() - ROLLBACK.windowMs);
  const [exposures, errors] = await Promise.all([
    prisma.flagEvent.count({ where: { environmentId, flagKey, type: "exposure", createdAt: { gte: since } } }),
    prisma.flagEvent.count({ where: { environmentId, flagKey, type: "error", createdAt: { gte: since } } }),
  ]);
  if (exposures < ROLLBACK.minExposures || errors / exposures <= ROLLBACK.errorRate) return false;

  const config = await prisma.flagConfig.findFirst({
    where: { environmentId, enabled: true, flag: { key: flagKey } },
    include: { environment: true, flag: { include: { project: { include: { org: { include: { users: { take: 1, orderBy: { createdAt: "asc" } } } } } } } } },
  });
  if (!config) return false;

  await prisma.flagConfig.update({ where: { id: config.id }, data: { enabled: false, rolledBackAt: new Date() } });

  const actor = config.flag.project.org.users[0];
  if (actor) {
    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "flag.autorollback",
        entityType: "FlagConfig",
        entityId: config.id,
        before: { enabled: true },
        after: { enabled: false, reason: `error rate ${(errors / exposures * 100).toFixed(1)}% over ${exposures} exposures` },
      },
    });
  }
  invalidate(config.environment.sdkKey);
  broadcast(config.environment.sdkKey, { type: "flags-changed", at: Date.now() });
  logger.warn({ flagKey, exposures, errors }, "flag auto-rolled back");
  return true;
}