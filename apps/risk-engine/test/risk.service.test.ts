import { expect, test } from "bun:test"
import type { ProjectionCompletedPayload, RiskCompletedPayload } from "@azimut/contracts"
import type { IRiskPublisher } from "../publishers/risk.publisher"
import type { IMarketClient } from "@azimut/market-client"
import RiskService from "../services/risk.service"

const request = { executionId: "e1", totalInvested: 1000, request: { allocations: [{ symbol: "AAA", weight: 1 }], startDate: "2023-01-02T00:00:00.000Z", endDate: "2024-01-10T00:00:00.000Z" } }

function setup(closes: IMarketClient["getDailyCloses"]) {
    const published: RiskCompletedPayload[] = []
    const projections: ProjectionCompletedPayload[] = []
    const order: string[] = []
    const service = new RiskService({
        completed: async (payload) => void (order.push("risk"), published.push(payload)),
        projectionCompleted: async (payload) => void (order.push("projection"), projections.push(payload)),
    } as IRiskPublisher)
    service.repo = {
        source: { provider: "yahoo-finance2", priceType: "TOTAL_RETURN" },
        getDividends: async () => ({ AAA: { currency: "EUR", dividends: [] } }),
        getDailyCloses: closes,
    }
    return { service, published, projections, order }
}

test("historique court : publie risk null", async () => {
    const { service, published } = setup(async () => ({ AAA: [{ date: "2023-01-02", close: 1 }] }))
    await service.compute(request)
    expect(published).toHaveLength(1)
    expect(published[0]).toMatchObject({ executionId: "e1", risk: null })
})

test("historique court : publie projection null", async () => {
    const { service, projections } = setup(async () => ({ AAA: [{ date: "2023-01-02", close: 1 }] }))
    await service.compute(request)
    expect(projections).toHaveLength(1)
    expect(projections[0]).toMatchObject({ executionId: "e1", projection: null })
})

test("historique suffisant : publie le risque puis la projection au capital investi", async () => {
    const closes = Array.from({ length: 300 }, (_, i) => ({
        date: new Date(Date.UTC(2023, 0, 2 + i)).toISOString().slice(0, 10),
        close: 100 + i + (i % 7),
    }))
    const { service, projections, order } = setup(async () => ({ AAA: closes }))
    await service.compute(request)
    expect(projections).toHaveLength(1)
    expect(projections[0]?.executionId).toBe("e1")
    expect(projections[0]?.projection).toMatchObject({ capital: 1000, seed: 42 })
    expect(order).toEqual(["risk", "projection"])
})

test("market-service en erreur : l'exception remonte, rien n'est publié", async () => {
    const { service, published } = setup(async () => {
        throw new Error("Market data unavailable")
    })
    await expect(service.compute(request)).rejects.toThrow("Market data unavailable")
    expect(published).toHaveLength(0)
})
