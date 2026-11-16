import { beforeEach, expect, test } from "bun:test"
import { COMPARABLE_STATUSES } from "../constants/backtest.constants"
import BacktestRepository from "../repositories/backtest.repository"
import RiskRepository from "../repositories/risk.repository"
import { prisma } from "../prisma"
import { createUser, describeWithDb, resetDatabase } from "./database"

const backtests = new BacktestRepository()
const repo = new RiskRepository()

const risk = {
    commonDays: 300,
    volatility: 0.12,
    var95: -0.02,
    cvar95: -0.03,
    assets: [{ symbol: "AAPL", weight: 1, volatility: 0.12, riskContribution: 1 }],
    correlations: [[1]],
    hhi: 1,
    effectiveAssets: 1,
    maxWeight: 1,
}

describeWithDb("RiskRepository (base de test)", () => {
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
            prisma.backtestResult.create({ data: { executionId, maxDrawdown: -0.214 } }),
        ])

    test("sans résultat terminé : result null ; backtest inconnu : null", async () => {
        expect((await repo.getByBacktestId(backtestId, COMPARABLE_STATUSES))?.result).toBeNull()
        expect(await repo.getByBacktestId("inconnu", COMPARABLE_STATUSES)).toBeNull()
    })

    test("setRisk : la première réception gagne, un rejeu n'écrase rien", async () => {
        await completeExecution()

        expect(await repo.setRisk(executionId, risk, new Date())).toBe(true)
        expect(await repo.setRisk(executionId, null, new Date())).toBe(false)

        const record = await repo.getByBacktestId(backtestId, COMPARABLE_STATUSES)
        expect(record?.result?.risk).toEqual(risk)
        expect(record?.result?.riskComputedAt).not.toBeNull()
        expect(record?.result?.maxDrawdown?.toNumber()).toBe(-0.214)
    })

    test("setRisk avec null : données insuffisantes, riskComputedAt renseigné", async () => {
        await completeExecution()

        await repo.setRisk(executionId, null, new Date())

        const record = await repo.getByBacktestId(backtestId, COMPARABLE_STATUSES)
        expect(record?.result?.risk).toBeNull()
        expect(record?.result?.riskComputedAt).not.toBeNull()
    })

    test("setRisk sans résultat : rien n'est écrit", async () => {
        expect(await repo.setRisk(executionId, risk, new Date())).toBe(false)
    })

    test("setMaxDrawdownLimit écrit la limite et la précédente", async () => {
        await repo.setMaxDrawdownLimit(backtestId, 0.25, 0.15)

        const record = await repo.getByBacktestId(backtestId, COMPARABLE_STATUSES)
        expect(record?.maxDrawdownLimit?.toNumber()).toBe(0.25)
        expect(record?.previousMaxDrawdownLimit?.toNumber()).toBe(0.15)
    })
})
