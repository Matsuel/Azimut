import { expect, test } from "bun:test"
import type { Risk } from "@azimut/contracts"
import type { IRiskRepository } from "../repositories/risk.repository"
import type { RiskRecord } from "../interfaces/risk.interface"
import RiskService from "../services/risk.service"

const decimal = (value: number) => ({ toNumber: () => value }) as never

const risk: Risk = {
    commonDays: 300,
    volatility: 0.12,
    var95: -0.02,
    cvar95: -0.03,
    assets: [
        { symbol: "AAA", weight: 0.5, volatility: 0.1, riskContribution: 0.2 },
        { symbol: "BBB", weight: 0.3, volatility: 0.2, riskContribution: 0.5 },
        { symbol: "CCC", weight: 0.2, volatility: 0.2, riskContribution: 0.3 },
    ],
    correlations: [
        [1, 0.3, 0.8],
        [0.3, 1, 0.1],
        [0.8, 0.1, 1],
    ],
    hhi: 0.38,
    effectiveAssets: 2.63,
    maxWeight: 0.5,
}

// Backtest de u1 avec un résultat dont le drawdown maximal vaut −0,214 ; `overrides` change le résultat ou les limites
type Result = NonNullable<RiskRecord["result"]>
function record(overrides: Partial<Omit<RiskRecord, "result">> & { result?: Partial<Result> | null } = {}): RiskRecord {
    const { result, ...rest } = overrides
    return {
        userId: "u1",
        maxDrawdownLimit: null,
        previousMaxDrawdownLimit: null,
        result: result === null ? null : { risk: risk as never, riskComputedAt: new Date(), maxDrawdown: decimal(-0.214), ...result },
        ...rest,
    }
}

function setup(initial: RiskRecord | null) {
    let current = initial
    const writes: { limit: number; previous: number | null }[] = []
    const stored: { executionId: string; risk: Risk | null }[] = []
    const service = new RiskService()
    service.repo = {
        getByBacktestId: async () => current,
        setMaxDrawdownLimit: async (_id: string, limit: number, previous: number | null) => {
            writes.push({ limit, previous })
            current = { ...current!, maxDrawdownLimit: decimal(limit), previousMaxDrawdownLimit: previous === null ? null : decimal(previous) }
        },
        setRisk: async (executionId: string, value: Risk | null) => {
            stored.push({ executionId, risk: value })
            return true
        },
    } as IRiskRepository
    return { service, writes, stored }
}

test("risque calculé : état COMPUTED avec les phrases de lecture", async () => {
    const view = await setup(record()).service.get("b1", "u1")

    expect(view.state).toBe("COMPUTED")
    expect(view.risk).toEqual(risk)
    expect(view.reading).toEqual({
        mostCorrelatedPair: { first: "AAA", second: "CCC", correlation: 0.8 },
        topContributor: { symbol: "BBB", riskContribution: 0.5 },
    })
    expect(view.constraint).toBeNull()
})

test("un seul actif : pas de paire corrélée", async () => {
    const single: Risk = { ...risk, assets: [risk.assets[0]!], correlations: [[1]] }
    const view = await setup(record({ result: { risk: single as never } })).service.get("b1", "u1")

    expect(view.reading).toEqual({ mostCorrelatedPair: null, topContributor: { symbol: "AAA", riskContribution: 0.2 } })
})

test("risk.completed avec risk null : DONNÉES INSUFFISANTES ; sans risk.completed : UNAVAILABLE (D16, D17)", async () => {
    const insufficient = await setup(record({ result: { risk: null } })).service.get("b1", "u1")
    expect(insufficient).toMatchObject({ state: "INSUFFICIENT_DATA", risk: null, reading: null })

    const old = await setup(record({ result: { risk: null, riskComputedAt: null } })).service.get("b1", "u1")
    expect(old).toMatchObject({ state: "UNAVAILABLE", risk: null, reading: null })

    const none = await setup(record({ result: null })).service.get("b1", "u1")
    expect(none).toMatchObject({ state: "UNAVAILABLE", constraint: null })
})

test("autre propriétaire : 403 ; backtest inconnu : 404", async () => {
    await expect(setup(record()).service.get("b1", "u2")).rejects.toMatchObject({ statusCode: 403 })
    await expect(setup(null).service.get("b1", "u1")).rejects.toMatchObject({ statusCode: 404, code: "BACKTEST_NOT_FOUND" })
})

test("contrainte : maxDrawdown −0,214 contre 0,15 → non respectée, 0,25 → respectée, 0,214 → respectée", async () => {
    for (const [limit, status] of [[0.15, "VIOLATED"], [0.25, "RESPECTED"], [0.214, "RESPECTED"]] as const) {
        const view = await setup(record({ maxDrawdownLimit: decimal(limit) })).service.get("b1", "u1")
        expect(view.constraint).toEqual({ measured: -0.214, current: { limit, status }, previous: null })
    }
})

test("setLimit : première limite sans « Précédente », la suivante décale la précédente (D12)", async () => {
    const { service, writes } = setup(record())

    const first = await service.setLimit("b1", "u1", 0.15)
    expect(first.constraint).toMatchObject({ current: { limit: 0.15, status: "VIOLATED" }, previous: null })

    const second = await service.setLimit("b1", "u1", 0.25)
    expect(second.constraint).toMatchObject({ current: { limit: 0.25, status: "RESPECTED" }, previous: { limit: 0.15, status: "VIOLATED" } })
    expect(writes).toEqual([{ limit: 0.15, previous: null }, { limit: 0.25, previous: 0.15 }])
})

test("setLimit avec la limite actuelle : aucune écriture, la « Précédente » est conservée", async () => {
    const { service, writes } = setup(record({ maxDrawdownLimit: decimal(0.25), previousMaxDrawdownLimit: decimal(0.15) }))

    const view = await service.setLimit("b1", "u1", 0.25)

    expect(writes).toEqual([])
    expect(view.constraint?.previous).toEqual({ limit: 0.15, status: "VIOLATED" })
})

test("setLimit sans résultat terminé : 400 BACKTEST_NO_RESULT, rien d'écrit", async () => {
    const { service, writes } = setup(record({ result: null }))

    await expect(service.setLimit("b1", "u1", 0.15)).rejects.toMatchObject({ statusCode: 400, code: "BACKTEST_NO_RESULT" })
    expect(writes).toEqual([])
})

test("setLimit d'un autre propriétaire : 403, rien d'écrit", async () => {
    const { service, writes } = setup(record())

    await expect(service.setLimit("b1", "u2", 0.15)).rejects.toMatchObject({ statusCode: 403 })
    expect(writes).toEqual([])
})

test("store enregistre le risque de l'exécution, y compris null", async () => {
    const { service, stored } = setup(record())

    await service.store({ executionId: "e1", finishedAt: "2024-01-01T00:00:00.000Z", risk })
    await service.store({ executionId: "e2", finishedAt: "2024-01-01T00:00:00.000Z", risk: null })

    expect(stored).toEqual([{ executionId: "e1", risk }, { executionId: "e2", risk: null }])
})
