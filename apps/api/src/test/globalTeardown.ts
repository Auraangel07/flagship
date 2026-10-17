import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Runs once after all tests: removes every org created by a @test.dev user.
export async function teardown() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    where: { email: { endsWith: "@test.dev" } },
    select: { orgId: true },
  });
  const orgIds = [...new Set(users.map((u) => u.orgId))];

  if (orgIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { user: { orgId: { in: orgIds } } } });
    await prisma.flagConfig.deleteMany({ where: { flag: { project: { orgId: { in: orgIds } } } } });
    await prisma.flag.deleteMany({ where: { project: { orgId: { in: orgIds } } } });
    await prisma.environment.deleteMany({ where: { project: { orgId: { in: orgIds } } } });
    await prisma.project.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { orgId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
  await prisma.$disconnect();
}