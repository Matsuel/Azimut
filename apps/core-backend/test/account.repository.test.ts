import { beforeEach, expect, test } from "bun:test"
import AccountRepository from "../repositories/account.repository"
import BacktestRepository from "../repositories/backtest.repository"
import PortfolioRepository from "../repositories/portfolio.repository"
import PricingRepository from "../repositories/pricing.repository"
import ProjectionRepository from "../repositories/projection.repository"
import RiskRepository from "../repositories/risk.repository"
import { prisma } from "../prisma"
import { createUser, describeWithDb, resetDatabase } from "./database"
import { pricingInput } from "./pricing.fixture"

const repo = new AccountRepository()
const backtests = new BacktestRepository()

// Un utilisateur avec un backtest terminé (exécution + résultat), un portefeuille et une demande de pricing
async function seed(userId: string) {
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
    const executionId = backtest.executions[0]!.id
    await prisma.backtestResult.create({ data: { executionId, maxDrawdown: -0.1 } })
    await new PortfolioRepository().create({ userId, name: "Principal" })
    await new PricingRepository().create(userId, pricingInput)
    return { backtestId: backtest.id, executionId }
}

const counts = async (userId: string) => ({
    backtests: await prisma.backtest.count({ where: { userId } }),
    allocations: await prisma.backtestAllocation.count({ where: { backtest: { userId } } }),
    executions: await prisma.backtestExecution.count({ where: { backtest: { userId } } }),
    results: await prisma.backtestResult.count({ where: { execution: { backtest: { userId } } } }),
    portfolios: await prisma.portfolio.count({ where: { userId } }),
    pricing: await prisma.pricingRequest.count({ where: { userId } }),
})

describeWithDb("AccountRepository (base de test)", () => {
    let userId: string
    let otherId: string
    beforeEach(async () => {
        await resetDatabase()
        userId = await createUser()
        otherId = await createUser("autre@test.dev")
    })

    test("deleteUserData supprime les seules données de l'utilisateur et garde son compte", async () => {
        await seed(userId)
        await seed(otherId)

        await repo.deleteUserData(userId)

        expect(await counts(userId)).toEqual({ backtests: 0, allocations: 0, executions: 0, results: 0, portfolios: 0, pricing: 0 })
        expect(await counts(otherId)).toEqual({ backtests: 1, allocations: 1, executions: 1, results: 1, portfolios: 1, pricing: 1 })
        expect(await prisma.user.count({ where: { id: { in: [userId, otherId] } } })).toBe(2)
    })

    test("un résultat qui arrive après la suppression est ignoré sans erreur", async () => {
        const { executionId } = await seed(userId)
        await repo.deleteUserData(userId)

        expect(await backtests.completeExecution(executionId, ["PENDING", "RUNNING"], { finishedAt: new Date(), maxDrawdown: -0.1 } as never)).toBe(false)
        expect(await new RiskRepository().setRisk(executionId, null, new Date())).toBe(false)
        expect(await new ProjectionRepository().setProjection(executionId, null, new Date(), 1)).toBe(false)
    })
})
