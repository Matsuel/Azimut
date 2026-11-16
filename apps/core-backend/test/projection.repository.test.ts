import { beforeEach, expect, test } from "bun:test"
import type { Projection } from "@azimut/contracts"
import { COMPARABLE_STATUSES } from "../constants/backtest.constants"
import BacktestRepository from "../repositories/backtest.repository"
import ProjectionRepository from "../repositories/projection.repository"
import { prisma } from "../prisma"
import { createUser, describeWithDb, resetDatabase } from "./database"

const backtests = new BacktestRepository()
const repo = new ProjectionRepository()

const point = { day: 0, p5: 1000, p10: 1000, p25: 1000, p50: 1000, p75: 1000, p90: 1000, p95: 1000 }
const projection: Projection = {
    seed: 42,
    paths: 10000,
    blockDays: 21,
    capital: 1000,
    historyStart: "2023-01-02",
    historyEnd: "2024-12-31",
    historyDays: 500,
    points: [point],
    years: [{ ...point, day: 252, years: 1, lossProbability: 0.2 }],
}

describeWithDb("ProjectionRepository (base de test)", () => {
    let backtestId: string
    let executionId: string
    beforeEach(async () => {
        await resetDatabase()
        const userId = await createUser()
        const backtest = await backtests.create({
            userId,
            name: "Test",
            startDate: new Date("2023-01-01"),
            endDate: new Date("2024-12-31"),
            investmentMode: "LUMP_SUM",
            initialAmount: 1000,
            rebalanceFrequency: "NONE",
            feeRate: 0.001,
            allocations: { create: [{ symbol: "AAPL", weight: 1 }] },
        })
        backtestId = backtest.id
        executionId = backtest.executions[0]!.id
    })

    const completeExecution = () =>
        prisma.$transaction([
            prisma.backtestExecution.update({ where: { id: executionId }, data: { status: "COMPLETED" } }),
            prisma.backtestResult.create({ data: { executionId } }),
        ])

    test("sans résultat terminé : result null ; backtest inconnu : null", async () => {
        expect((await repo.getByBacktestId(backtestId, COMPARABLE_STATUSES))?.result).toBeNull()
        expect(await repo.getByBacktestId("inconnu", COMPARABLE_STATUSES)).toBeNull()
    })

    test("setProjection : la première réception gagne, un rejeu n'écrase rien", async () => {
        await completeExecution()

        expect(await repo.setProjection(executionId, projection, new Date())).toBe(true)
        expect(await repo.setProjection(executionId, null, new Date())).toBe(false)

        const record = await repo.getByBacktestId(backtestId, COMPARABLE_STATUSES)
        expect(record?.result?.projection).toEqual(projection)
        expect(record?.result?.projectionComputedAt).not.toBeNull()
    })

    test("setProjection avec null : historique insuffisant, projectionComputedAt renseigné", async () => {
        await completeExecution()

        await repo.setProjection(executionId, null, new Date())

        const record = await repo.getByBacktestId(backtestId, COMPARABLE_STATUSES)
        expect(record?.result?.projection).toBeNull()
        expect(record?.result?.projectionComputedAt).not.toBeNull()
    })

    test("setProjection sans résultat : rien n'est écrit", async () => {
        expect(await repo.setProjection(executionId, projection, new Date())).toBe(false)
    })
})
