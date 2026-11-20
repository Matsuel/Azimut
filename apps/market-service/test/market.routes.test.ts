import { afterAll, beforeAll, expect, spyOn, test } from "bun:test"
import { INTERNAL_KEY_HEADER } from "@azimut/contracts"
import internalAuthMiddleware from "../middleware/internal-auth.middleware"
import createMarketRoutes from "../routes/market/market.routes"
import MarketService from "../services/market.service"
import { env } from "../env"
import { startApp } from "@azimut/http/testing"

const closes = spyOn(MarketService.prototype, "getDailyCloses").mockResolvedValue({ AAPL: [{ date: "2024-01-02", close: 185.64 }] })
const dividends = spyOn(MarketService.prototype, "getDividends").mockResolvedValue({ AAPL: { currency: "USD", dividends: [] } })
const rates = spyOn(MarketService.prototype, "getRateCurve").mockResolvedValue({ currency: "USD", points: [{ symbol: "^TNX", maturityYears: 10, rate: 0.0421, date: "2026-10-28" }] })
const search = spyOn(MarketService.prototype, "searchMarket").mockResolvedValue([])
const details = spyOn(MarketService.prototype, "getMarketDetails").mockResolvedValue([])
const defaults = spyOn(MarketService.prototype, "getDefaultsMarketAssets").mockResolvedValue({ data: [], count: 0, page: 1, pageSize: 10 } as never)

let app: Awaited<ReturnType<typeof startApp>>
beforeAll(async () => {
    // La clé interne protège toutes les routes, comme dans index.ts
    app = await startApp(createMarketRoutes().map((route) => ({ ...route, middlewares: [internalAuthMiddleware] })))
})
afterAll(async () => {
    await app.close()
    closes.mockRestore()
    dividends.mockRestore()
    rates.mockRestore()
    search.mockRestore()
    details.mockRestore()
    defaults.mockRestore()
})

const withKey = { [INTERNAL_KEY_HEADER]: env.INTERNAL_API_KEY }
const closesQuery = "symbols=AAPL&start=2024-01-02T00:00:00.000Z&end=2024-01-10T00:00:00.000Z"

test("sans clé interne : 401 UNAUTHORIZED", async () => {
    const response = await app.request(`/api/market/closes?${closesQuery}`)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "Unauthorized", code: "UNAUTHORIZED" })
})

test("GET /api/market/closes : 200 avec les séries et les symboles découpés pour le service", async () => {
    const response = await app.request(`/api/market/closes?${closesQuery}`, { headers: withKey })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ AAPL: [{ date: "2024-01-02", close: 185.64 }] })
    expect(closes.mock.calls.at(-1)).toEqual([["AAPL"], new Date("2024-01-02T00:00:00.000Z"), new Date("2024-01-10T00:00:00.000Z")])
})

test("GET /api/market/dividends : 200, un titre sans dividende donne une liste vide", async () => {
    const response = await app.request(`/api/market/dividends?${closesQuery}`, { headers: withKey })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ AAPL: { currency: "USD", dividends: [] } })
    expect(dividends.mock.calls.at(-1)).toEqual([["AAPL"], new Date("2024-01-02T00:00:00.000Z"), new Date("2024-01-10T00:00:00.000Z")])
})

test("GET /api/market/dividends invalide : 400 INVALID_QUERY", async () => {
    const response = await app.request("/api/market/dividends?symbols=AAPL", { headers: withKey })

    expect(response.status).toBe(400)
})

test("GET /api/market/closes invalide : 400 INVALID_QUERY", async () => {
    const response = await app.request("/api/market/closes?symbols=AAPL", { headers: withKey })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "INVALID_QUERY" })
})

test("GET /api/market/search trop court : 400 INVALID_QUERY, sinon 200", async () => {
    const tooShort = await app.request("/api/market/search?query=a", { headers: withKey })
    expect(tooShort.status).toBe(400)
    expect(((await tooShort.json()) as { issues: unknown[] }).issues).toHaveLength(1)
    expect((await app.request("/api/market/search?query=apple", { headers: withKey })).status).toBe(200)
})

test("GET /api/market/details/:id : période inconnue 400 INVALID_QUERY, sinon 200 avec l'id et la période", async () => {
    const invalid = await app.request("/api/market/details/AAPL?period=2y", { headers: withKey })
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toMatchObject({ code: "INVALID_QUERY" })

    const response = await app.request("/api/market/details/AAPL?period=1y", { headers: withKey })
    expect(response.status).toBe(200)
    expect(details).toHaveBeenCalledWith("AAPL", "1y")
})

test("GET /api/market/defaults : pagination invalide 400, sinon 200 avec la page demandée", async () => {
    const invalid = await app.request("/api/market/defaults?page=0", { headers: withKey })
    expect(invalid.status).toBe(400)

    const response = await app.request("/api/market/defaults?page=2&pageSize=5", { headers: withKey })
    expect(response.status).toBe(200)
    expect(defaults).toHaveBeenCalledWith({ page: 2, pageSize: 5 })
})

test("GET /api/market/rates : 200 avec la courbe", async () => {
    const response = await app.request("/api/market/rates", { headers: withKey })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ currency: "USD", points: [{ symbol: "^TNX", maturityYears: 10, rate: 0.0421, date: "2026-10-28" }] })
})
