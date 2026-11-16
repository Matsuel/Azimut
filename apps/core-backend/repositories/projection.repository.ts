import type { Projection } from "@azimut/contracts"
import { prisma } from "../prisma"
import { Prisma, type BacktestStatus } from "../generated/prisma/client"
import type { ProjectionRecord } from "../interfaces/projection.interface"

export interface IProjectionRepository {
    getByBacktestId(backtestId: string, statuses: BacktestStatus[]): Promise<ProjectionRecord | null>
    setProjection(executionId: string, projection: Projection | null, computedAt: Date): Promise<boolean>
}

class ProjectionRepository implements IProjectionRepository {
    async getByBacktestId(backtestId: string, statuses: BacktestStatus[]): Promise<ProjectionRecord | null> {
        const [backtest, result] = await prisma.$transaction([
            prisma.backtest.findUnique({
                where: { id: backtestId },
                select: { userId: true },
            }),
            prisma.backtestResult.findFirst({
                where: { execution: { backtestId, status: { in: statuses } } },
                orderBy: [{ execution: { createdAt: "desc" } }, { execution: { attempt: "desc" } }],
                select: { projection: true, projectionComputedAt: true },
            }),
        ])
        return backtest && { ...backtest, result }
    }

    async setProjection(executionId: string, projection: Projection | null, computedAt: Date): Promise<boolean> {
        // Première réception gagne : un rejeu de `projection.completed` n'écrase rien
        const { count } = await prisma.backtestResult.updateMany({
            where: { executionId, projectionComputedAt: null },
            // Une colonne Json n'accepte pas null : DbNull écrit NULL en base
            data: { projection: projection ?? Prisma.DbNull, projectionComputedAt: computedAt },
        })
        return count > 0
    }
}

export default ProjectionRepository
