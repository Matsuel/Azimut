import { expect, test } from "bun:test"
import type { BondInput, PricingCompletedPayload, PricingFailedPayload, PricingRequestedPayload, RateCurve } from "@azimut/contracts"
import type { IMarketClient, IOptionChainClient, IRateCurveClient } from "@azimut/market-client"
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
    service.repo = { getRateCurve: async () => (curveReads++, getRateCurve()) } as unknown as PricingService["repo"]
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

// Chaîne d'options (19)
const quote = (strike: number, bid: number, ask: number) => ({ strike, bid, ask, lastPrice: ask, volume: 1, yahooVolatility: null })
const chainOf = (expiration: string) => ({
    symbol: "SPY",
    spot: 100,
    expirations: ["2026-11-02", "2026-12-18", "2027-01-15", "2027-02-19", "2027-03-19"],
    expiration,
    calls: [quote(100, 4.2, 4.4), quote(130, 0, 0)],
    puts: [quote(90, 0.9, 1.1)],
})
const chainRequest: PricingRequestedPayload = { requestId: "c1", kind: "OPTION_CHAIN", chain: { symbol: "SPY" } }

function setupChain(overrides: Partial<IOptionChainClient & IRateCurveClient & Pick<IMarketClient, "getDailyCloses">> = {}) {
    const { service, completed, failed } = setup()
    const expirationsRead: (string | undefined)[] = []
    service.now = () => new Date("2026-10-28T10:00:00Z")
    service.repo = {
        getRateCurve: async () => curve,
        getOptionInputs: async () => ({ symbol: "SPY", currency: "USD", spot: 100, dividendYield: 0.01, volatility: 0.2 }),
        getOptionChain: async (_symbol: string, expiration?: string) => (expirationsRead.push(expiration), chainOf(expiration ?? "2026-11-02")),
        // 40 clôtures qui alternent : seules les 31 dernières servent
        getDailyCloses: async () => ({ SPY: Array.from({ length: 40 }, (_, i) => ({ date: `2026-09-${String((i % 28) + 1).padStart(2, "0")}`, close: 100 * (i % 2 ? 1.01 : 1) })) }),
        ...overrides,
    }
    return { service, completed, failed, expirationsRead }
}

test("chaîne : 3 échéances à 14 jours ou plus, taux court de la courbe, volatilité historique 30 jours", async () => {
    const { service, completed, failed, expirationsRead } = setupChain()

    await service.run(chainRequest)

    expect(failed).toEqual([])
    const result = completed[0]!.result
    if (result.kind !== "OPTION_CHAIN") throw new Error("kind")
    expect(result.chain.smile.map((curve) => curve.expiration)).toEqual(["2026-12-18", "2027-01-15", "2027-02-19"])
    expect(result.chain.chainExpiration).toBe("2026-12-18")
    expect(result.chain).toMatchObject({ asOf: "2026-10-28", spot: 100, rate: 0.05, dividendYield: 0.01, contractsTotal: 9, discarded: { noBidAsk: 3 } })
    expect(result.chain.historicalVolatility).toBeGreaterThan(0)
    // La chaîne la plus proche (2026-11-02, écartée) n'est relue que pour les échéances retenues
    expect(expirationsRead).toEqual([undefined, "2026-12-18", "2027-01-15", "2027-02-19"])
})

test("chaîne : aucune échéance assez lointaine → pricing.failed avec la cause", async () => {
    const { service, completed, failed } = setupChain({
        getOptionChain: async () => ({ ...chainOf("2026-11-02"), expirations: ["2026-11-02"] }),
    })

    await service.run(chainRequest)

    expect(completed).toEqual([])
    expect(failed[0]!.reason).toContain("No option expiration")
})

test("chaîne : symbole inconnu de market-service → pricing.failed", async () => {
    const { service, failed } = setupChain({
        getOptionInputs: async () => {
            throw new Error("Market data unavailable (market-service responded 404 SYMBOL_NOT_FOUND)")
        },
    })

    await service.run(chainRequest)

    expect(failed[0]!.reason).toContain("SYMBOL_NOT_FOUND")
})
