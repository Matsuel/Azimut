import { afterEach, expect, test } from "bun:test"
import { MarketClient } from "../src"

const client = () => new MarketClient({ baseUrl: "http://market.test", apiKey: "test-internal-key-0000" })

const realFetch = globalThis.fetch
afterEach(() => {
    globalThis.fetch = realFetch
})

// Remplace fetch ; `calls` garde l'URL et les en-têtes de chaque appel
function stubFetch(respond: () => Response) {
    const calls: { url: string; headers: Headers }[] = []
    globalThis.fetch = (async (input: URL, init?: RequestInit) => {
        calls.push({ url: String(input), headers: new Headers(init?.headers) })
        return respond()
    }) as unknown as typeof fetch
    return calls
}

const start = new Date("2024-01-02T00:00:00.000Z")
const end = new Date("2024-01-10T00:00:00.000Z")

test("lit les cours auprès de market-service avec la clé interne", async () => {
    const calls = stubFetch(() => Response.json({ AAA: [{ date: "2024-01-02", close: 10.5 }], BBB: [] }))

    const prices = await client().getDailyCloses(["AAA", "BBB"], start, end)

    expect(prices).toEqual({ AAA: [{ date: "2024-01-02", close: 10.5 }], BBB: [] })
    const url = new URL(calls[0]!.url)
    expect(url.pathname).toBe("/api/market/closes")
    expect(url.searchParams.get("symbols")).toBe("AAA,BBB")
    expect(url.searchParams.get("start")).toBe("2024-01-02T00:00:00.000Z")
    expect(url.searchParams.get("end")).toBe("2024-01-10T00:00:00.000Z")
    expect(calls[0]!.headers.get("x-internal-key")).toBe("test-internal-key-0000")
})

test("une réponse hors 2xx lève une erreur avec son code (le service appelant la traite)", async () => {
    const calls = stubFetch(() => Response.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 }))

    await expect(client().getDailyCloses(["AAA"], start, end)).rejects.toThrow("market-service responded 500 INTERNAL_ERROR")
    // Un 500 (symbole inconnu) ne se rejoue pas
    expect(calls).toHaveLength(1)
})

test("un 503 puis un succès : une seconde tentative réussit", async () => {
    let attempt = 0
    const calls = stubFetch(() => (++attempt === 1 ? new Response("down", { status: 503 }) : Response.json({ AAA: [] })))

    expect(await client().getDailyCloses(["AAA"], start, end)).toEqual({ AAA: [] })
    expect(calls).toHaveLength(2)
})

test("market-service injoignable deux fois de suite : l'erreur remonte après deux tentatives", async () => {
    let attempts = 0
    globalThis.fetch = (async () => {
        attempts++
        throw new TypeError("fetch failed")
    }) as unknown as typeof fetch

    await expect(client().getDailyCloses(["AAA"], start, end)).rejects.toThrow("fetch failed")
    expect(attempts).toBe(2)
})

test("une réponse qui ne respecte pas le contrat est refusée", async () => {
    stubFetch(() => Response.json({ AAA: [{ date: "pas-une-date", close: "x" }] }))

    expect(client().getDailyCloses(["AAA"], start, end)).rejects.toThrow()
})

test("lit les dividendes et la devise auprès de market-service", async () => {
    const calls = stubFetch(() => Response.json({ AAA: { currency: "USD", dividends: [{ date: "2024-02-09", amount: 0.24 }] }, BBB: { currency: "EUR", dividends: [] } }))

    const dividends = await client().getDividends(["AAA", "BBB"], start, end)

    expect(dividends.AAA).toEqual({ currency: "USD", dividends: [{ date: "2024-02-09", amount: 0.24 }] })
    expect(dividends.BBB!.dividends).toEqual([])
    expect(new URL(calls[0]!.url).pathname).toBe("/api/market/dividends")
    expect(calls[0]!.headers.get("x-internal-key")).toBeTruthy()
})


test("lit la courbe des taux avec la clé interne et valide la réponse", async () => {
    const curve = { currency: "USD", points: [{ symbol: "^TNX", maturityYears: 10, rate: 0.0421, date: "2026-10-28" }] }
    const calls = stubFetch(() => Response.json(curve))

    expect(await client().getRateCurve()).toEqual(curve)
    expect(new URL(calls[0]!.url).pathname).toBe("/api/market/rates")
    expect(calls[0]!.headers.get("x-internal-key")).toBe("test-internal-key-0000")
})

test("courbe hors contrat : erreur", async () => {
    stubFetch(() => Response.json({ currency: "USD", points: [] }))

    await expect(client().getRateCurve()).rejects.toThrow()
})

test("entrées d'option : symbole en query, réponse validée par le contrat", async () => {
    const inputs = { symbol: "SPY", currency: "USD", spot: 582, dividendYield: 0.012, volatility: 0.15 }
    const calls = stubFetch(() => Response.json(inputs))

    expect(await client().getOptionInputs("SPY")).toEqual(inputs)
    const url = new URL(calls[0]!.url)
    expect(url.pathname).toBe("/api/market/option-inputs")
    expect(url.searchParams.get("symbol")).toBe("SPY")
})

test("chaîne d'options : échéance transmise seulement si fournie, réponse hors contrat refusée", async () => {
    const chain = { symbol: "SPY", spot: 582, expirations: ["2026-12-19"], expiration: "2026-12-19", calls: [], puts: [] }
    const calls = stubFetch(() => Response.json(chain))

    expect(await client().getOptionChain("SPY", "2026-12-19")).toEqual(chain)
    await client().getOptionChain("SPY")
    expect(new URL(calls[0]!.url).pathname).toBe("/api/market/options")
    expect(new URL(calls[0]!.url).searchParams.get("expiration")).toBe("2026-12-19")
    expect(new URL(calls[1]!.url).searchParams.has("expiration")).toBe(false)

    stubFetch(() => Response.json({ ...chain, spot: 0 }))
    await expect(client().getOptionChain("SPY")).rejects.toThrow()
})
