import { expect, test } from "bun:test"
import type { RiskCompletedPayload } from "@azimut/contracts"
import type { IRiskPublisher } from "../publishers/risk.publisher"
import type { IMarketClient } from "@azimut/market-client"
import RiskService from "../services/risk.service"

const request = { executionId: "e1", request: { allocations: [{ symbol: "AAA", weight: 1 }], startDate: "2023-01-02T00:00:00.000Z", endDate: "2024-01-10T00:00:00.000Z" } }

function setup(closes: IMarketClient["getDailyCloses"]) {
    const published: RiskCompletedPayload[] = []
    const service = new RiskService({ completed: async (payload) => void published.push(payload) } as IRiskPublisher)
    service.repo = {
        source: { provider: "yahoo-finance2", priceType: "TOTAL_RETURN" },
        getDividends: async () => ({ AAA: { currency: "EUR", dividends: [] } }),
        getDailyCloses: closes,
    }
    return { service, published }
}

test("historique court : publie risk null", async () => {
    const { service, published } = setup(async () => ({ AAA: [{ date: "2023-01-02", close: 1 }] }))
    await service.compute(request)
    expect(published).toHaveLength(1)
    expect(published[0]).toMatchObject({ executionId: "e1", risk: null })
})

test("market-service en erreur : l'exception remonte, rien n'est publié", async () => {
    const { service, published } = setup(async () => {
        throw new Error("Market data unavailable")
    })
    await expect(service.compute(request)).rejects.toThrow("Market data unavailable")
    expect(published).toHaveLength(0)
})
