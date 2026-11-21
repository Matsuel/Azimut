import { afterEach, expect, spyOn, test } from "bun:test"
import { BadGatewayError } from "@azimut/http"
import MarketRepository from "../repositories/market.repository"

// Client yahoo-finance2 privé de la classe : simulé pour ne faire aucun appel réseau
type Yahoo = Record<"chart" | "search" | "quote", (...args: unknown[]) => Promise<unknown>>
const yahoo = (MarketRepository as unknown as { yahooFinance: Yahoo }).yahooFinance
const start = new Date("2024-01-01T00:00:00Z")
const end = new Date("2024-12-31T00:00:00Z")

const spies: ReturnType<typeof spyOn>[] = []
const mockChart = (chart: unknown) => {
    spies.push(spyOn(yahoo, "chart").mockResolvedValue(chart))
}

afterEach(() => spies.splice(0).forEach((spy) => spy.mockRestore()))

test("getRateCurve convertit le pourcentage Yahoo en ratio et date chaque taux dans le fuseau de la place", async () => {
    spies.push(spyOn(yahoo, "quote").mockImplementation(async (symbol) => ({
        regularMarketPrice: symbol === "^IRX" ? 4.1470003 : 4.21,
        regularMarketTime: new Date("2026-10-28T02:00:00Z"),
        exchangeTimezoneName: "America/Chicago",
    })))

    const curve = await new MarketRepository().getRateCurve()

    expect(curve.currency).toBe("USD")
    expect(curve.points.map((point) => point.symbol)).toEqual(["^IRX", "^FVX", "^TNX", "^TYX"])
    expect(curve.points[0]).toEqual({ symbol: "^IRX", maturityYears: 0.25, rate: 0.04147, date: "2026-10-27" })
})

test("getRateCurve refuse une courbe dont un indice n'a pas de cotation", async () => {
    spies.push(spyOn(yahoo, "quote").mockImplementation(async (symbol) => (symbol === "^TNX" ? {} : { regularMarketPrice: 4, regularMarketTime: new Date() })))

    await expect(new MarketRepository().getRateCurve()).rejects.toBeInstanceOf(BadGatewayError)
})

test("getDailyCloses lit le jour de cotation dans le fuseau de la place et écarte les jours sans clôture", async () => {
    mockChart({
        meta: { exchangeTimezoneName: "Asia/Tokyo", currency: "JPY" },
        quotes: [
            // 15:00 UTC le 4 janvier = 00:00 le 5 à Tokyo
            { date: new Date("2024-01-04T15:00:00Z"), close: 100 },
            { date: new Date("2024-01-05T15:00:00Z"), close: null },
        ],
    })

    const closes = await new MarketRepository().getDailyCloses(["7203.T"], start, end)

    expect(closes).toEqual({ "7203.T": [{ date: "2024-01-05", close: 100 }] })
})

test("getDailyCloses ramène un cours en pence en livres", async () => {
    mockChart({
        meta: { exchangeTimezoneName: "Europe/London", currency: "GBp" },
        quotes: [{ date: new Date("2024-01-02T12:00:00Z"), close: 250 }],
    })

    const closes = await new MarketRepository().getDailyCloses(["VOD.L"], start, end)

    expect(closes["VOD.L"]).toEqual([{ date: "2024-01-02", close: 2.5 }])
})

test("getDividends lit l'ex-date dans le fuseau de la place, trie par date et convertit les pence", async () => {
    mockChart({
        meta: { exchangeTimezoneName: "Australia/Sydney", currency: "GBp" },
        quotes: [],
        events: {
            dividends: [
                { date: new Date("2024-06-10T20:00:00Z"), amount: 30 },
                { date: new Date("2024-03-04T20:00:00Z"), amount: 10 },
            ],
        },
    })

    const dividends = await new MarketRepository().getDividends(["X.L"], start, end)

    // 20:00 UTC = lendemain matin à Sydney
    expect(dividends).toEqual({
        "X.L": {
            currency: "GBP",
            dividends: [
                { date: "2024-03-05", amount: 0.1 },
                { date: "2024-06-11", amount: 0.3 },
            ],
        },
    })
})

test("getDividends rend une liste vide sans dividende", async () => {
    mockChart({ meta: { exchangeTimezoneName: "America/New_York", currency: "USD" }, quotes: [] })

    const dividends = await new MarketRepository().getDividends(["AAPL"], start, end)

    expect(dividends).toEqual({ AAPL: { currency: "USD", dividends: [] } })
})

test("getDetails sans série lève une BadGatewayError", async () => {
    mockChart(undefined)

    await expect(new MarketRepository().getDetails("AAPL", "1d")).rejects.toBeInstanceOf(BadGatewayError)
})

test("search ne garde que les résultats Yahoo complets, nom court sinon long sinon symbole", async () => {
    spies.push(
        spyOn(yahoo, "search").mockResolvedValue({
            quotes: [
                { isYahooFinance: true, symbol: "AAPL", shortname: "Apple", exchange: "NMS", quoteType: "EQUITY" },
                { isYahooFinance: true, symbol: "MSFT", longname: "Microsoft Corp", exchange: "NMS", quoteType: "EQUITY" },
                { isYahooFinance: true, symbol: "X", shortname: "Sans place", quoteType: "EQUITY" },
                { isYahooFinance: false, symbol: "NEWS", shortname: "Article", exchange: "X", quoteType: "NEWS" },
            ],
        }),
    )

    const results = await new MarketRepository().search("a")

    expect(results.map(({ symbol, name }) => ({ symbol, name }))).toEqual([
        { symbol: "AAPL", name: "Apple" },
        { symbol: "MSFT", name: "Microsoft Corp" },
    ])
})

test("getDetails rend l'historique en ISO et omet les intervalles sans clôture", async () => {
    mockChart({
        quotes: [
            { date: new Date("2024-01-02T00:00:00Z"), close: 10 },
            { date: new Date("2024-01-03T00:00:00Z"), close: null },
        ],
    })

    expect(await new MarketRepository().getDetails("AAPL", "1m")).toEqual([{ date: "2024-01-02T00:00:00.000Z", price: 10 }])
})

test("getAssets garde l'ordre demandé et omet un actif indisponible sans bloquer les autres", async () => {
    spies.push(
        spyOn(yahoo, "quote").mockImplementation(async (symbol) => {
            if (symbol === "BAD") throw new Error("not found")
            return { symbol, shortName: `${symbol} Inc`, regularMarketPrice: 100, regularMarketChangePercent: -1.5 }
        }),
    )
    mockChart({ quotes: [{ date: new Date("2024-01-02T00:00:00Z"), close: 99 }] })

    const assets = await new MarketRepository().getAssets(["MSFT", "BAD", "AAPL"])

    expect(assets.map((asset) => asset.symbol)).toEqual(["MSFT", "AAPL"])
    expect(assets[0]).toMatchObject({ name: "MSFT Inc", price: 100, change24h: -1.5, volume24h: null, history: [{ price: 99 }] })
})
