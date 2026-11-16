import type { Projection } from "@azimut/contracts"
import { prisma } from "../prisma"
import { Prisma, type BacktestStatus } from "../generated/prisma/client"
import { ACTIVE_STATUSES } from "../constants/backtest.constants"
import type { ProjectionRecord } from "../interfaces/projection.interface"

export interface IProjectionRepository {
    getByBacktestId(backtestId: string, statuses: BacktestStatus[]): Promise<ProjectionRecord | null>
    setProjection(executionId: string, projection: Projection | null, computedAt: Date, durationMs: number | null): Promise<boolean>
}

class ProjectionRepository implements IProjectionRepository {
    async getByBacktestId(backtestId: string, statuses: BacktestStatus[]): Promise<ProjectionRecord | null> {
        const [backtest, result, executions, computed] = await prisma.$transaction([
            prisma.backtest.findUnique({
                where: { id: backtestId },
                select: { userId: true },
            }),
            prisma.backtestResult.findFirst({
                where: { execution: { backtestId, status: { in: statuses } } },
                orderBy: [{ execution: { createdAt: "desc" } }, { execution: { attempt: "desc" } }],
                select: { projection: true, createdAt: true, projectionComputedAt: true, projectionExpected: true, projectionDurationMs: true },
            }),
            // Historique : exécutions avec résultat ou en cours, sans relire le Json de la projection
            prisma.backtestExecution.findMany({
                where: { backtestId, OR: [{ result: { isNot: null } }, { status: { in: ACTIVE_STATUSES } }] },
                orderBy: [{ attempt: "desc" }],
                select: { id: true, attempt: true, result: { select: { createdAt: true, projectionComputedAt: true, projectionExpected: true, projectionDurationMs: true } } },
            }),
            prisma.backtestResult.findMany({
                where: { execution: { backtestId }, projection: { not: Prisma.DbNull } },
                select: { executionId: true },
            }),
        ])
        const withProjection = new Set(computed.map(({ executionId }) => executionId))
        const runs = executions.map(({ id, attempt, result }) => ({
            id,
            attempt,
            result: result && { ...result, hasProjection: withProjection.has(id) },
        }))
        return backtest && { ...backtest, result, runs }
    }

    async setProjection(executionId: string, projection: Projection | null, computedAt: Date, durationMs: number | null): Promise<boolean> {
        // Première réception gagne : un rejeu de `projection.completed` n'écrase rien
        const { count } = await prisma.backtestResult.updateMany({
            where: { executionId, projectionComputedAt: null },
            // Une colonne Json n'accepte pas null : DbNull écrit NULL en base
            data: { projection: projection ?? Prisma.DbNull, projectionComputedAt: computedAt, projectionDurationMs: durationMs },
        })
        return count > 0
    }
}

export default ProjectionRepository
