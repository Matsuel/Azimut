import { expect, test } from "bun:test"
import type { BondInput, PricingCompletedPayload, PricingFailedPayload, PricingRequestedPayload, RateCurve } from "@azimut/contracts"
import type { IRateCurveClient } from "@azimut/market-client"
import type { IPricingPublisher } from "../publishers/pricing.publisher"
import PricingService from "../services/pricing.service"

const curve: RateCurve = {
    currency: "USD",
    points: [
        { symbol: "^FVX", maturityYears: 5, rate: 0.05, date: "2026-10-28" },
        { symbol: "^TNX", maturityYears: 10, rate: 0.06, date: "2026-10-28" },
    ],
}

const request = (discount: BondInput["discount"], maturityYears = 5): PricingRequestedPayload => ({
    requestId: "p1",
    kind: "BOND",
    bond: { nominal: 100, couponRate: 0, maturityYears, discount, valueDate: "2026-10-28" },
})

function setup(getRateCurve: () => Promise<RateCurve> = async () => curve) {
    const completed: PricingCompletedPayload[] = []
    const failed: PricingFailedPayload[] = []
    const publisher: IPricingPublisher = { completed: async (p) => void completed.push(p), failed: async (p) => void failed.push(p) }
    const service = new PricingService(publisher)
    let curveReads = 0
    service.repo = { getRateCurve: async () => (curveReads++, getRateCurve()) } as IRateCurveClient
    return { service, completed, failed, curveReads: () => curveReads }
}

test("taux plat : zéro-coupon à 3 % sur 5 ans = 86,26, sans lire la courbe", async () => {
    const { service, completed, failed, curveReads } = setup()

    await service.run(request({ source: "FLAT", rate: 0.03 }))

    expect(failed).toEqual([])
    expect(completed).toHaveLength(1)
    expect(completed[0]).toMatchObject({ requestId: "p1", result: { kind: "BOND", bond: { price: 86.26, discountSource: "FLAT" } } })
    expect(curveReads()).toBe(0)
})

test("taux de courbe : courbe lue, taux interpolé à la maturité", async () => {
    const { service, completed } = setup()

    await service.run(request({ source: "CURVE" }, 7))

    expect((completed[0]!.result as Extract<typeof completed[0]["result"], { kind: "BOND" }>).bond).toMatchObject({ rate: 0.054, discountSource: "CURVE", curveDate: "2026-10-28" })
})

test("maturité hors de la courbe : pricing.failed avec la cause, rien de publié en completed", async () => {
    const { service, completed, failed } = setup()

    await service.run(request({ source: "CURVE" }, 20))

    expect(completed).toEqual([])
    expect(failed).toHaveLength(1)
    expect(failed[0]!.reason).toContain("outside the rate curve")
})

test("courbe indisponible : pricing.failed", async () => {
    const { service, failed } = setup(async () => {
        throw new Error("Market data unavailable (market-service responded 502)")
    })

    await service.run(request({ source: "CURVE" }))

    expect(failed[0]!.reason).toContain("market-service responded 502")
})

test("option : prix calculé sur les seuls paramètres, courbe jamais lue", async () => {
    const { service, completed, failed, curveReads } = setup()

    await service.run({
        requestId: "p2",
        kind: "OPTION",
        option: { spot: 100, strike: 100, maturityYears: 1, rate: 0.05, dividendYield: 0, volatility: 0.2 },
    })

    expect(failed).toEqual([])
    expect(completed).toHaveLength(1)
    expect(completed[0]).toMatchObject({ requestId: "p2", result: { kind: "OPTION", option: { call: { price: 10.45 }, put: { price: 5.57 }, parityGap: 0 } } })
    expect(curveReads()).toBe(0)
})

test("option hors plage numérique : pricing.failed, rien en completed", async () => {
    const { service, completed, failed } = setup()

    await service.run({
        requestId: "p3",
        kind: "OPTION",
        option: { spot: 100, strike: 100, maturityYears: 1, rate: 0.05, dividendYield: 0, volatility: 1e-320 },
    })

    expect(completed).toEqual([])
    expect(failed[0]).toMatchObject({ requestId: "p3", reason: "Option parameters out of numeric range" })
})
