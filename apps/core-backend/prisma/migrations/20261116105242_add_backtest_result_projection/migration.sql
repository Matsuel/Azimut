-- AlterTable
ALTER TABLE "BacktestResult" ADD COLUMN     "projection" JSONB,
ADD COLUMN     "projectionComputedAt" TIMESTAMP(3);
