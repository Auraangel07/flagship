import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { writeAudit } from "../lib/audit";
import { authenticate, requireRole, AuthedRequest } from "../middleware/auth";
import { notifyProject } from "../lib/notify";

export const projectsRouter = Router();
const param = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);
projectsRouter.use(authenticate);

const projectSchema = z.object({
  name: z.string().min(2),
  key: z.string().regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, dashes"),
});

// Create a project (auto-creates development + production environments)
projectsRouter.post("/", requireRole("ADMIN", "DEVELOPER"), async (req: AuthedRequest, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { orgId, sub } = req.user!;
  const exists = await prisma.project.findUnique({
    where: { orgId_key: { orgId, key: parsed.data.key } },
  });
  if (exists) return res.status(409).json({ error: "Project key already exists" });

  const project = await prisma.project.create({
    data: {
      ...parsed.data,
      orgId,
      environments: { create: [{ name: "development" }, { name: "production" }] },
    },
    include: { environments: true },
  });
  await writeAudit({ userId: sub, action: "project.create", entityType: "Project", entityId: project.id, after: { name: project.name, key: project.key } });
  res.status(201).json(project);
});

projectsRouter.get("/", async (req: AuthedRequest, res) => {
  const projects = await prisma.project.findMany({
    where: { orgId: req.user!.orgId },
    include: { environments: true },
  });
  res.json(projects);
});

// Helper: confirm project belongs to the caller's org
async function getOwnedProject(projectId: string, orgId: string) {
  return prisma.project.findFirst({ where: { id: projectId, orgId } });
}

const flagSchema = z.object({
  key: z.string().regex(/^[a-z0-9_-]+$/, "lowercase letters, numbers, dashes, underscores"),
  description: z.string().optional(),
});

// Create a flag (config rows are created for every environment, disabled by default)
projectsRouter.post("/:projectId/flags", requireRole("ADMIN", "DEVELOPER"), async (req: AuthedRequest, res) => {
  const parsed = flagSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });


  const project = await getOwnedProject(param(req.params.projectId), req.user!.orgId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const dup = await prisma.flag.findUnique({
    where: { projectId_key: { projectId: project.id, key: parsed.data.key } },
  });
  if (dup) return res.status(409).json({ error: "Flag key already exists" });

  const envs = await prisma.environment.findMany({ where: { projectId: project.id } });
  const flag = await prisma.flag.create({
    data: {
      ...parsed.data,
      projectId: project.id,
      configs: { create: envs.map((e) => ({ environmentId: e.id })) },
    },
    include: { configs: true },
  });
  await writeAudit({ userId: req.user!.sub, action: "flag.create", entityType: "Flag", entityId: flag.id, after: { key: flag.key } });
   await notifyProject(project.id);
  res.status(201).json(flag);
});

projectsRouter.get("/:projectId/flags", async (req: AuthedRequest, res) => {
  const project = await getOwnedProject(param(req.params.projectId), req.user!.orgId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const flags = await prisma.flag.findMany({
    where: { projectId: project.id },
    include: { configs: { include: { environment: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(flags);
});

const configSchema = z.object({
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  rules: z
    .array(
      z.object({
        attribute: z.string().min(1),
        operator: z.enum(["equals", "not_equals", "in", "contains"]),
        values: z.array(z.string()).min(1),
      })
    )
    .optional(),
});

// Update a flag's config in one environment (toggle, rollout %, rules)
projectsRouter.patch(
  "/:projectId/flags/:flagId/environments/:envId",
  requireRole("ADMIN", "DEVELOPER"),
  async (req: AuthedRequest, res) => {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const project = await getOwnedProject(param(req.params.projectId), req.user!.orgId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const config = await prisma.flagConfig.findFirst({
      where: {
        flagId: param(req.params.flagId),
        environmentId: param(req.params.envId),
        flag: { projectId: project.id },
      },
    });
    if (!config) return res.status(404).json({ error: "Flag config not found" });

    const updated = await prisma.flagConfig.update({
      where: { id: config.id },
      data: parsed.data,
    });
    await writeAudit({
      userId: req.user!.sub,
      action: "flag.update",
      entityType: "FlagConfig",
      entityId: config.id,
      before: { enabled: config.enabled, rolloutPercentage: config.rolloutPercentage, rules: config.rules },
      after: { enabled: updated.enabled, rolloutPercentage: updated.rolloutPercentage, rules: updated.rules },
    });
        await notifyProject(project.id);
    res.json(updated);
  }
);

// Delete a flag (admins only)
projectsRouter.delete("/:projectId/flags/:flagId", requireRole("ADMIN"), async (req: AuthedRequest, res) => {
  const project = await getOwnedProject(param(req.params.projectId), req.user!.orgId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const flag = await prisma.flag.findFirst({ where: { id: param(req.params.flagId), projectId: project.id } });
  if (!flag) return res.status(404).json({ error: "Flag not found" });

  await prisma.flagConfig.deleteMany({ where: { flagId: flag.id } });
  await prisma.flag.delete({ where: { id: flag.id } });
  await writeAudit({ userId: req.user!.sub, action: "flag.delete", entityType: "Flag", entityId: flag.id, before: { key: flag.key } });
    await notifyProject(project.id);
  res.status(204).send();
});

// Audit trail for the org
projectsRouter.get("/audit/logs", async (req: AuthedRequest, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { user: { orgId: req.user!.orgId } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { email: true } } },
  });
  res.json(logs);
});