import { prisma } from "./prisma";
import { FlagConfigInput, Rule } from "../engine/evaluate";

export interface EnvSnapshot {
  environmentId: string;
  projectId: string;
  flags: Record<string, FlagConfigInput>;
  loadedAt: number;
}

const TTL_MS = 60_000; // safety net; real freshness comes from invalidation
const store = new Map<string, EnvSnapshot>();
export const cacheStats = { hits: 0, misses: 0 };

export async function getSnapshot(sdkKey: string): Promise<EnvSnapshot | null> {
  const hit = store.get(sdkKey);
  if (hit && Date.now() - hit.loadedAt < TTL_MS) {
    cacheStats.hits++;
    return hit;
  }
  cacheStats.misses++;

  const env = await prisma.environment.findUnique({
    where: { sdkKey },
    include: { configs: { include: { flag: true } } },
  });
  if (!env) {
    store.delete(sdkKey);
    return null;
  }

  const flags: Record<string, FlagConfigInput> = {};
  for (const c of env.configs) {
    flags[c.flag.key] = {
      enabled: c.enabled,
      rolloutPercentage: c.rolloutPercentage,
      rules: c.rules as unknown as Rule[],
    };
  }
  const snap: EnvSnapshot = {
    environmentId: env.id,
    projectId: env.projectId,
    flags,
    loadedAt: Date.now(),
  };
  store.set(sdkKey, snap);
  return snap;
}

export function invalidate(sdkKey: string) {
  store.delete(sdkKey);
}