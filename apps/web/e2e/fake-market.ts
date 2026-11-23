// Faux market-service des tests E2E : mêmes routes et même contrat que apps/market-service, cours calculés à partir de la
// date (aucun appel à Yahoo) pour des résultats identiques à chaque exécution. Lancé par `stack.ts`.
import {
    dailyClosesSchema,
    dividendsSchema,
    INTERNAL_KEY_HEADER,
    type MarketAsset,
    type MarketData,
    marketAssetSchema,
    marketDataSchema,
    marketDetailsSchema,
    optionInputsSchema,
    rateCurveSchema,
} from "@azimut/contracts"
import { INTERNAL_API_KEY, PORTS } from "./env"

const DAY_MS = 86_400_000
// Origine de la tendance des cours (2000-01-01, en jours depuis l'epoch) : cours proches de leur base sur 2020-2026
const EPOCH_2000 = 10_957

/** Actifs connus du faux service ; `URTH` est le benchmark proposé par défaut par le formulaire. */
export const ASSETS: (MarketData & { base: number })[] = [
    { symbol: "AAPL", name: "Apple Inc.", exchange: "NMS", assetType: "EQUITY", base: 150 },
    { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NMS", assetType: "EQUITY", base: 300 },
    { symbol: "GLD", name: "SPDR Gold Shares", exchange: "PCX", assetType: "ETF", base: 180 },
    { symbol: "URTH", name: "iShares MSCI World ETF", exchange: "PCX", assetType: "ETF", base: 120 },
]

const baseOf = (symbol: string) => ASSETS.find((asset) => asset.symbol === symbol)?.base ?? 100

// Cours d'un jour : tendance haussière et cycle de ±8 % (des baisses pour le drawdown et le risque), décalé par symbole
const closeOn = (symbol: string, day: number) => {
    const phase = symbol.length + symbol.charCodeAt(0)
    return (
        Math.round(baseOf(symbol) * (1 + (day - EPOCH_2000) * 0.0002) * (1 + 0.08 * Math.sin(day / 25 + phase)) * 100) /
        100
    )
}

// Jours ouvrés (lundi-vendredi) de `start` inclus à `end` exclu, en jours depuis l'epoch
const businessDays = (start: Date, end: Date) => {
    const days: number[] = []
    for (let day = Math.floor(start.getTime() / DAY_MS); day < Math.floor(end.getTime() / DAY_MS); day++) {
        const weekday = new Date(day * DAY_MS).getUTCDay()
        if (weekday !== 0 && weekday !== 6) days.push(day)
    }
    return days
}

const isoDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10)

// Champs de l'actif tels que les renvoie le vrai service (sans la base de cours du faux)
const dataOf = ({ symbol, name, exchange, assetType }: MarketData): MarketData => ({
    symbol,
    name,
    exchange,
    assetType,
})

const toAsset = (data: MarketData): MarketAsset => {
    const today = Math.floor(Date.now() / DAY_MS)
    return marketAssetSchema.parse({
        symbol: data.symbol,
        name: data.name,
        price: closeOn(data.symbol, today),
        change24h: 0.5,
        volume24h: 1_000_000,
        history: [{ date: new Date(today * DAY_MS).toISOString(), price: closeOn(data.symbol, today) }],
    })
}

// Requête des cours : `symbols`, `start` et `end` comme le vrai service (dailyClosesQuerySchema)
const readRange = (params: URLSearchParams) => ({
    symbols: (params.get("symbols") ?? "").split(",").filter(Boolean),
    start: new Date(params.get("start") ?? ""),
    end: new Date(params.get("end") ?? ""),
})

function route(url: URL): unknown {
    const path = url.pathname.replace(/^\/api\/market/, "")
    const params = url.searchParams

    if (path === "/closes") {
        const { symbols, start, end } = readRange(params)
        const closes = symbols.map((symbol) => [
            symbol,
            businessDays(start, end).map((day) => ({ date: isoDay(day), close: closeOn(symbol, day) })),
        ])
        return dailyClosesSchema.parse(Object.fromEntries(closes))
    }
    if (path === "/dividends") {
        // Cotation en euros : aucun taux de change demandé par l'engine
        const { symbols } = readRange(params)
        return dividendsSchema.parse(Object.fromEntries(symbols.map((s) => [s, { currency: "EUR", dividends: [] }])))
    }
    if (path === "/rates") {
        // Taux fixes (ratio annuel), jour de cotation fixe : même courbe à chaque exécution
        const points = [
            ["^IRX", 0.25, 0.0432],
            ["^FVX", 5, 0.0398],
            ["^TNX", 10, 0.0421],
            ["^TYX", 30, 0.0456],
        ].map(([symbol, maturityYears, rate]) => ({ symbol, maturityYears, rate, date: "2026-10-28" }))
        return rateCurveSchema.parse({ currency: "USD", points })
    }
    if (path === "/option-inputs") {
        // Entrées fixes d'un actif connu (même contrat que le vrai service) ; un symbole inconnu : 404 SYMBOL_NOT_FOUND
        const symbol = params.get("symbol") ?? ""
        if (!ASSETS.some((asset) => asset.symbol === symbol)) return { notFound: true }
        const spot = closeOn(symbol, Math.floor(Date.now() / DAY_MS))
        return optionInputsSchema.parse({ symbol, currency: "USD", spot, dividendYield: 0.005, volatility: 0.243 })
    }
    if (path === "/search") {
        const query = (params.get("query") ?? "").toLowerCase()
        return ASSETS.filter(({ symbol, name }) => `${symbol} ${name}`.toLowerCase().includes(query)).map((asset) =>
            marketDataSchema.parse(dataOf(asset)),
        )
    }
    if (path.startsWith("/details/")) {
        const symbol = decodeURIComponent(path.slice("/details/".length))
        const today = Math.floor(Date.now() / DAY_MS)
        return Array.from({ length: 30 }, (_, i) => today - 29 + i).map((day) =>
            marketDetailsSchema.parse({ date: new Date(day * DAY_MS).toISOString(), price: closeOn(symbol, day) }),
        )
    }
    if (path === "/defaults") {
        const page = Number(params.get("page") ?? 1)
        const pageSize = Number(params.get("pageSize") ?? 10)
        const data = ASSETS.slice((page - 1) * pageSize, page * pageSize).map(toAsset)
        return { data, count: ASSETS.length, page, pageSize }
    }
    return null
}

Bun.serve({
    port: PORTS.market,
    fetch(request) {
        const url = new URL(request.url)
        // Sondes sans clé interne, comme le vrai service : fournisseur toujours joignable (cours fixes)
        if (url.pathname === "/liveness") return Response.json({ status: "ok" })
        if (url.pathname === "/readiness") return Response.json({ status: "ok", checks: { provider: "ok" } })
        // Même garde que le vrai service : seuls core-backend et les engines l'appellent
        if (request.headers.get(INTERNAL_KEY_HEADER) !== INTERNAL_API_KEY) {
            return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
        }
        const body = route(url)
        if (typeof body === "object" && body !== null && "notFound" in body)
            return Response.json({ error: "Symbol not found", code: "SYMBOL_NOT_FOUND" }, { status: 404 })
        return body === null
            ? Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 })
            : Response.json(body)
    },
})

console.log(`Fake market-service listening on ${PORTS.market}`)
