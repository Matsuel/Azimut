-- AlterTable
ALTER TABLE "BacktestResult" ADD COLUMN     "projectionDurationMs" INTEGER,
ADD COLUMN     "projectionExpected" BOOLEAN NOT NULL DEFAULT false;
