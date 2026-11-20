-- CreateEnum
CREATE TYPE "PricingKind" AS ENUM ('BOND');

-- CreateEnum
CREATE TYPE "PricingStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "PricingRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "PricingKind" NOT NULL,
    "status" "PricingStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "PricingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingRequest_userId_createdAt_idx" ON "PricingRequest"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PricingRequest" ADD CONSTRAINT "PricingRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
