import type { Risk } from "@azimut/contracts"
import { prisma } from "../prisma"
import { Prisma, type BacktestStatus } from "../generated/prisma/client"
import type { RiskRecord } from "../interfaces/risk.interface"

export interface IRiskRepository {
    getByBacktestId(backtestId: string, statuses: BacktestStatus[]): Promise<RiskRecord | null>
    setRisk(executionId: string, risk: Risk | null, computedAt: Date): Promise<boolean>
    setMaxDrawdownLimit(backtestId: string, limit: number, previous: number | null): Promise<void>
}

class RiskRepository implements IRiskRepository {
    async getByBacktestId(backtestId: string, statuses: BacktestStatus[]): Promise<RiskRecord | null> {
        const [backtest, result] = await prisma.$transaction([
            prisma.backtest.findUnique({
                where: { id: backtestId },
                select: { userId: true, name: true, maxDrawdownLimit: true, previousMaxDrawdownLimit: true },
            }),
            prisma.backtestResult.findFirst({
                where: { execution: { backtestId, status: { in: statuses } } },
                orderBy: [{ execution: { createdAt: "desc" } }, { execution: { attempt: "desc" } }],
                select: { risk: true, riskComputedAt: true, maxDrawdown: true },
            }),
        ])
        return backtest && { ...backtest, result }
    }

    async setRisk(executionId: string, risk: Risk | null, computedAt: Date): Promise<boolean> {
        // Première réception gagne : un rejeu de `risk.completed` n'écrase rien
        const { count } = await prisma.backtestResult.updateMany({
            where: { executionId, riskComputedAt: null },
            // Une colonne Json n'accepte pas null : DbNull écrit NULL en base
            data: { risk: risk ?? Prisma.DbNull, riskComputedAt: computedAt },
        })
        return count > 0
    }

    async setMaxDrawdownLimit(backtestId: string, limit: number, previous: number | null): Promise<void> {
        await prisma.backtest.update({
            where: { id: backtestId },
            data: { maxDrawdownLimit: limit, previousMaxDrawdownLimit: previous },
        })
    }
}

export default RiskRepository
