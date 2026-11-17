-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BACKTEST_COMPLETED', 'BACKTEST_FAILED', 'RISK_CONSTRAINT_VIOLATED', 'PROJECTION_COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('BACKTESTS', 'RISK');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "params" JSONB NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupKey_key" ON "Notification"("dedupKey");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
