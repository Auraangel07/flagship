import { prisma } from "./prisma";
import { invalidate } from "./cache";
import { broadcast } from "./events";

// Call after any change that affects flags: clears cache and pings live clients.
export async function notifyProject(projectId: string) {
  const envs = await prisma.environment.findMany({ where: { projectId } });
  for (const e of envs) {
    invalidate(e.sdkKey);
    broadcast(e.sdkKey, { type: "flags-changed", at: Date.now() });
  }
}