import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export async function writeAudit(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: (params.before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      after: (params.after ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });
}