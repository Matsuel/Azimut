import { afterEach, expect, spyOn, test } from "bun:test"
import { NotFoundError } from "@azimut/http"
import { API_ERROR_CODES, optionInputsSchema } from "@azimut/contracts"
import MarketRepository from "../repositories/market.repository"
import MarketService from "../services/market.service"
import { historicalVolatility, trailingDividendYield } from "../utils/option-inputs"

// Clôtures qui alternent +1 % / -1 % : écart-type connu, indépendant du hasard
const alternating = (days: number) => Array.from({ length: days }, (_, i) => 100 * (i % 2 === 0 ? 1 : 1.01))

test("historicalVolatility annualise l'écart-type des rendements logarithmiques sur 252 jours", () => {
    const closes = alternating(60)
    const volatility = historicalVolatility(closes)!

    const returns = closes.slice(1).map((close, i) => Math.log(close / closes[i]!))
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const sd = Math.sqrt(returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1))
    expect(volatility).toBeCloseTo(sd * Math.sqrt(252), 10)
})

test("historicalVolatility vaut null sans historique suffisant ou sur une série plate", () => {
    expect(historicalVolatility(alternating(10))).toBeNull()
    expect(historicalVolatility([])).toBeNull()
    expect(historicalVolatility(Array(60).fill(100))).toBeNull()
})

test("trailingDividendYield rapporte les dividendes au cours, 0 sans dividende", () => {
    expect(trailingDividendYield([0.5, 0.5, 0.5, 0.5], 200)).toBeCloseTo(0.01, 10)
    expect(trailingDividendYield([], 200)).toBe(0)
})

type Yahoo = Record<"chart" | "quote", (...args: unknown[]) => Promise<unknown>>
const yahoo = (MarketRepository as unknown as { yahooFinance: Yahoo }).yahooFinance
const spies: ReturnType<typeof spyOn>[] = []
afterEach(() => spies.splice(0).forEach((spy) => spy.mockRestore()))

const mockYahoo = (quote: unknown, chart: unknown) => {
    spies.push(spyOn(yahoo, "quote").mockResolvedValue(quote), spyOn(yahoo, "chart").mockResolvedValue(chart))
}
const quotes = alternating(60).map((close, i) => ({ date: new Date(Date.UTC(2026, 0, 1 + i)), close }))

test("getOptionInputs : spot, rendement du dividende 1 an et volatilité, conformes au contrat", async () => {
    mockYahoo(
        { regularMarketPrice: 200 },
        {
            meta: { exchangeTimezoneName: "America/New_York", currency: "USD" },
            quotes,
            events: { dividends: [{ date: new Date("2026-02-01"), amount: 1 }, { date: new Date("2026-05-01"), amount: 1 }] },
        },
    )

    const inputs = await new MarketRepository().getOptionInputs("AAPL")

    expect(optionInputsSchema.parse(inputs)).toEqual(inputs)
    expect(inputs).toMatchObject({ symbol: "AAPL", currency: "USD", spot: 200, dividendYield: 0.01 })
    expect(inputs.volatility).toBeGreaterThan(0)
})

test("getOptionInputs : un titre en pence est rendu en livres, spot et dividendes", async () => {
    mockYahoo(
        { regularMarketPrice: 20_000 },
        {
            meta: { exchangeTimezoneName: "Europe/London", currency: "GBp" },
            quotes: [],
            events: { dividends: [{ date: new Date("2026-02-01"), amount: 400 }] },
        },
    )

    const inputs = await new MarketRepository().getOptionInputs("X.L")

    expect(inputs).toMatchObject({ currency: "GBP", spot: 200, dividendYield: 0.02, volatility: null })
})

test("getOptionInputs : historique court, volatilité null sans plantage", async () => {
    mockYahoo(
        { regularMarketPrice: 100 },
        { meta: { exchangeTimezoneName: "UTC", currency: "USD" }, quotes: quotes.slice(0, 5) },
    )

    expect((await new MarketRepository().getOptionInputs("NEW")).volatility).toBeNull()
})

test("getOptionInputs : symbole inconnu → NotFoundError SYMBOL_NOT_FOUND", async () => {
    mockYahoo(undefined, {})

    const error = await new MarketRepository().getOptionInputs("ZZZZ").catch((e) => e)

    expect(error).toBeInstanceOf(NotFoundError)
    expect(error.code).toBe(API_ERROR_CODES.SYMBOL_NOT_FOUND)
})

test("getOptionInputs : cours nul, négatif ou arrondi à 0 → SYMBOL_NOT_FOUND", async () => {
    for (const [price, currency] of [[0, "USD"], [-1, "USD"], [0.00004, "USD"], [0.004, "GBp"]] as const) {
        mockYahoo({ regularMarketPrice: price }, { meta: { exchangeTimezoneName: "UTC", currency }, quotes: [] })

        const error = await new MarketRepository().getOptionInputs("X").catch((e) => e)

        expect(error).toBeInstanceOf(NotFoundError)
        expect(error.code).toBe(API_ERROR_CODES.SYMBOL_NOT_FOUND)
        spies.splice(0).forEach((spy) => spy.mockRestore())
    }
})

test("les entrées d'une option ne sont jamais gardées en cache", async () => {
    let calls = 0
    const service = new MarketService()
    service.repo = { getOptionInputs: async () => (calls++, {}) } as never

    await service.getOptionInputs("AAPL")
    await service.getOptionInputs("AAPL")

    expect(calls).toBe(2)
})
