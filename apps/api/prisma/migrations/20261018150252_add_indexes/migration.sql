-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Flag_projectId_createdAt_idx" ON "Flag"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");
