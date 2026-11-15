-- AlterTable
ALTER TABLE "Backtest" ADD COLUMN     "maxDrawdownLimit" DECIMAL(3,2),
ADD COLUMN     "previousMaxDrawdownLimit" DECIMAL(3,2);

-- AlterTable
ALTER TABLE "BacktestResult" ADD COLUMN     "risk" JSONB,
ADD COLUMN     "riskComputedAt" TIMESTAMP(3);
