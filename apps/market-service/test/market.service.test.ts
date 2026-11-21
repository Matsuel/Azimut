import { expect, test } from "bun:test"
import type { MarketAsset } from "@azimut/contracts"
import { DEFAULT_TICKERS } from "../constants/market.constants"
import type { IMarketRepository } from "../repositories/market.repository"
import MarketService from "../services/market.service"

test("la liste par défaut n'interroge le fournisseur que pour les symboles de la page", async () => {
    const asked: string[][] = []
    const service = new MarketService()
    service.repo = {
        getAssets: async (symbols: string[]) => {
            asked.push(symbols)
            return symbols.map((symbol) => ({ symbol }) as MarketAsset)
        },
    } as unknown as IMarketRepository

    const page = await service.getDefaultsMarketAssets({ page: 2, pageSize: 3 })

    expect(asked).toEqual([DEFAULT_TICKERS.slice(3, 6)])
    expect(page).toMatchObject({ count: DEFAULT_TICKERS.length, page: 2, pageSize: 3 })
    expect(page.data).toHaveLength(3)
})

// Repository factice qui compte les appels au fournisseur
function countingRepo() {
    const calls = { search: 0, details: 0, assets: 0, closes: 0 }
    const repo = {
        search: async () => (calls.search++, []),
        getDetails: async () => (calls.details++, []),
        getAssets: async (symbols: string[]) => (calls.assets++, symbols.map((symbol) => ({ symbol }) as MarketAsset)),
        getDailyCloses: async () => (calls.closes++, {}),
    } as unknown as IMarketRepository
    return { repo, calls }
}

test("la courbe des taux est gardée en cache", async () => {
    let calls = 0
    const service = new MarketService()
    service.repo = { getRateCurve: async () => (calls++, { currency: "USD", points: [] }) } as unknown as IMarketRepository

    await service.getRateCurve()
    await service.getRateCurve()

    expect(calls).toBe(1)
})

test("recherche, détails et liste par défaut sont gardés en cache", async () => {
    const { repo, calls } = countingRepo()
    const service = new MarketService()
    service.repo = repo

    await service.searchMarket("Apple")
    await service.searchMarket("apple")
    await service.getMarketDetails("AAPL", "1y")
    await service.getMarketDetails("AAPL", "1y")
    await service.getMarketDetails("AAPL", "1m")
    await service.getDefaultsMarketAssets({ page: 1, pageSize: 3 })
    await service.getDefaultsMarketAssets({ page: 1, pageSize: 3 })

    expect(calls).toEqual({ search: 1, details: 2, assets: 1, closes: 0 })
})

test("les cours d'un backtest ne sont jamais gardés en cache", async () => {
    const { repo, calls } = countingRepo()
    const service = new MarketService()
    service.repo = repo

    await service.getDailyCloses(["AAPL"], new Date("2024-01-01"), new Date("2024-02-01"))
    await service.getDailyCloses(["AAPL"], new Date("2024-01-01"), new Date("2024-02-01"))

    expect(calls.closes).toBe(2)
})

test("une liste par défaut incomplète (actif indisponible) n'est pas gardée en cache", async () => {
    let calls = 0
    const service = new MarketService()
    service.repo = {
        getAssets: async (symbols: string[]) => (calls++, symbols.slice(1).map((symbol) => ({ symbol }) as MarketAsset)),
    } as unknown as IMarketRepository

    await service.getDefaultsMarketAssets({ page: 1, pageSize: 3 })
    await service.getDefaultsMarketAssets({ page: 1, pageSize: 3 })

    expect(calls).toBe(2)
})

// Service dont le fournisseur répond selon `ping` ; compte les appels
function probedService(ping: () => Promise<void>) {
    const calls = { ping: 0 }
    const service = new MarketService()
    service.repo = { ping: () => (calls.ping++, ping()) } as unknown as IMarketRepository
    return { service, calls }
}

test("readiness : le fournisseur répond → true", async () => {
    const { service } = probedService(async () => {})
    expect(await service.isProviderReachable()).toBe(true)
})

test("readiness : le fournisseur lève → false, sans propager l'erreur", async () => {
    const { service } = probedService(async () => {
        throw new Error("Yahoo down")
    })
    expect(await service.isProviderReachable()).toBe(false)
})

test("readiness : délai de 1,5 s dépassé → false", async () => {
    const { service } = probedService(() => new Promise<void>(() => {}))
    expect(await service.isProviderReachable()).toBe(false)
})

test("readiness : un succès est gardé, le fournisseur n'est interrogé qu'une fois", async () => {
    const { service, calls } = probedService(async () => {})
    await service.isProviderReachable()
    expect(await service.isProviderReachable()).toBe(true)
    expect(calls.ping).toBe(1)
})

test("readiness : un échec est gardé aussi, Yahoo en panne n'est pas martelé", async () => {
    const { service, calls } = probedService(async () => {
        throw new Error("Yahoo down")
    })
    await service.isProviderReachable()
    expect(await service.isProviderReachable()).toBe(false)
    expect(calls.ping).toBe(1)
})
