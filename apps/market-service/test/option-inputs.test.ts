import { afterEach, expect, spyOn, test } from "bun:test"
import { NotFoundError } from "@azimut/http"
import { API_ERROR_CODES, optionChainSchema, optionInputsSchema } from "@azimut/contracts"
import MarketRepository from "../repositories/market.repository"
import MarketService from "../services/market.service"
import { trailingDividendYield } from "../utils/option-inputs"

// Clôtures qui alternent +1 % / -1 % : écart-type connu, indépendant du hasard
const alternating = (days: number) => Array.from({ length: days }, (_, i) => 100 * (i % 2 === 0 ? 1 : 1.01))

test("trailingDividendYield rapporte les dividendes au cours, 0 sans dividende", () => {
    expect(trailingDividendYield([0.5, 0.5, 0.5, 0.5], 200)).toBeCloseTo(0.01, 10)
    expect(trailingDividendYield([], 200)).toBe(0)
})

type Yahoo = Record<"chart" | "quote" | "options", (...args: unknown[]) => Promise<unknown>>
const yahoo = (MarketRepository as unknown as { yahooFinance: Yahoo }).yahooFinance
const spies: ReturnType<typeof spyOn>[] = []
afterEach(() => spies.splice(0).forEach((spy) => spy.mockRestore()))

// Sans chaîne fournie, `options` échoue : l'implicite retombe sur null sans appel réseau
const mockYahoo = (quote: unknown, chart: unknown, options?: (symbol: unknown, query?: { date?: Date }) => Promise<unknown>) => {
    spies.push(
        spyOn(yahoo, "quote").mockResolvedValue(quote),
        spyOn(yahoo, "chart").mockResolvedValue(chart),
        spyOn(yahoo, "options").mockImplementation((options ?? (async () => { throw new Error("no chain") })) as never),
    )
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

test("getOptionChain : cotations brutes conformes au contrat, valeurs absentes ramenées à 0 ou null", async () => {
    const contract = { strike: 580, bid: 15.7, ask: 16, lastPrice: 15.85, volume: 120, impliedVolatility: 0.184 }
    spies.push(
        spyOn(yahoo, "options").mockResolvedValue({
            quote: { regularMarketPrice: 582 },
            expirationDates: [new Date("2026-12-19T00:00:00Z"), new Date("2026-11-21T00:00:00Z")],
            options: [{ expirationDate: new Date("2026-11-21T00:00:00Z"), calls: [contract, { strike: 590 }], puts: [] }],
        }),
    )

    const chain = await new MarketRepository().getOptionChain("SPY")

    expect(optionChainSchema.parse(chain)).toEqual(chain)
    expect(chain).toMatchObject({ spot: 582, expiration: "2026-11-21", expirations: ["2026-11-21", "2026-12-19"] })
    expect(chain.calls[0]).toEqual({ strike: 580, bid: 15.7, ask: 16, lastPrice: 15.85, volume: 120, yahooVolatility: 0.184 })
    expect(chain.calls[1]).toEqual({ strike: 590, bid: 0, ask: 0, lastPrice: 0, volume: null, yahooVolatility: null })
})

test("getOptionChain : échéance demandée transmise à Yahoo ; symbole sans chaîne → SYMBOL_NOT_FOUND", async () => {
    const options = spyOn(yahoo, "options").mockResolvedValue({ quote: { regularMarketPrice: 582 }, expirationDates: [], options: [] })
    spies.push(options)

    const error = await new MarketRepository().getOptionChain("ZZZZ", "2026-12-19").catch((e) => e)

    expect(options).toHaveBeenCalledWith("ZZZZ", { date: new Date("2026-12-19T00:00:00Z") })
    expect(error).toBeInstanceOf(NotFoundError)
    expect(error.code).toBe(API_ERROR_CODES.SYMBOL_NOT_FOUND)
})

const DAY = 86_400_000
const day = (offset: number) => new Date(Math.floor(Date.now() / DAY) * DAY + offset * DAY)
const chartOf = { meta: { exchangeTimezoneName: "UTC", currency: "USD" }, quotes }
const contract = (strike: number, impliedVolatility?: number) => ({ strike, impliedVolatility })

// Chaîne Yahoo simulée : échéances proche (10 j) et lointaines (45 j, 90 j) ; l'option sans date demandée renvoie la plus proche
const chainOf = (calls: Record<string, unknown>[], puts: Record<string, unknown>[]) => async (_symbol: unknown, query: { date?: Date } = {}) => {
    const expirationDate = query.date ?? day(10)
    return {
        quote: { regularMarketPrice: 100 },
        expirationDates: [day(10), day(45), day(90)],
        options: [{ expirationDate, calls: expirationDate.getTime() === day(45).getTime() ? calls : [contract(100, 0.9)], puts: expirationDate.getTime() === day(45).getTime() ? puts : [] }],
    }
}

test("getOptionInputs : implicite au strike le plus proche du cours, moyenne call et put, première échéance à 30 jours ou plus", async () => {
    mockYahoo({ regularMarketPrice: 100 }, chartOf, chainOf([contract(90, 0.5), contract(101, 0.24)], [contract(101, 0.26), contract(110, 0.7)]))

    const inputs = await new MarketRepository().getOptionInputs("AAPL")

    expect(optionInputsSchema.parse(inputs)).toEqual(inputs)
    expect(inputs.impliedVolatility).toBe(0.25)
})

test("getOptionInputs : un seul côté coté, ou implicite nulle au strike : repli sur ce qui existe puis null", async () => {
    mockYahoo({ regularMarketPrice: 100 }, chartOf, chainOf([contract(100, 0.3)], [contract(100, 0)]))
    expect((await new MarketRepository().getOptionInputs("A")).impliedVolatility).toBe(0.3)
    spies.splice(0).forEach((spy) => spy.mockRestore())

    mockYahoo({ regularMarketPrice: 100 }, chartOf, chainOf([contract(100)], [contract(100, 0)]))
    expect((await new MarketRepository().getOptionInputs("A")).impliedVolatility).toBeNull()
})

test("getOptionInputs : aucune échéance à 30 jours ou plus : implicite null", async () => {
    mockYahoo({ regularMarketPrice: 100 }, chartOf, async () => ({
        quote: { regularMarketPrice: 100 },
        expirationDates: [day(5), day(29)],
        options: [{ expirationDate: day(5), calls: [contract(100, 0.4)], puts: [] }],
    }))

    expect((await new MarketRepository().getOptionInputs("A")).impliedVolatility).toBeNull()
})

test("getOptionInputs : chaîne en erreur : option-inputs répond quand même, implicite null", async () => {
    mockYahoo({ regularMarketPrice: 100 }, chartOf)

    const inputs = await new MarketRepository().getOptionInputs("A")

    expect(inputs).toMatchObject({ spot: 100, impliedVolatility: null })
})
