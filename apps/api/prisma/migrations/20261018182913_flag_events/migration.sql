-- AlterTable
ALTER TABLE "FlagConfig" ADD COLUMN     "rolledBackAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FlagEvent" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlagEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlagEvent_environmentId_flagKey_createdAt_idx" ON "FlagEvent"("environmentId", "flagKey", "createdAt");
