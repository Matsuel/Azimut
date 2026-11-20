import { expect, test } from "bun:test"
import { MONITORED_SERVICES, type ReadinessResponse } from "@azimut/contracts"
import MonitoringService from "../services/monitoring.service"

type Reply = { status: number; body: unknown } | Error

const ok: ReadinessResponse = { status: "ok", checks: { kafka: "ok" } }
const timeout = () => new DOMException("The operation timed out.", "TimeoutError")
const refused = () => Object.assign(new TypeError("fetch failed"), { code: "ConnectionRefused" })

// Service dont les sondes distantes répondent selon `replies` (par défaut 200 ok) ; `ready` = état des contrôles de core-backend
function setup(replies: Partial<Record<string, Reply>> = {}, ready = true) {
    const calls: { url: string; signal: AbortSignal | null | undefined }[] = []
    const service = new MonitoringService()
    service.checks = [{ name: "database", check: () => ready }, { name: "kafka", check: () => true }]
    service.urls = {
        "market-service": "http://market",
        "notification-service": "http://notification",
        "backtest-engine": "http://backtest",
        "risk-engine": "http://risk",
    }
    service.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input)
        calls.push({ url, signal: init?.signal })
        const reply = replies[new URL(url).host] ?? { status: 200, body: ok }
        if (reply instanceof Error) throw reply
        return Response.json(reply.body, { status: reply.status })
    }) as typeof fetch
    return { service, calls }
}

test("tous les services répondent 200 : up, latence mesurée, synthèse sans service down", async () => {
    const { service, calls } = setup()
    const { services, summary } = await service.getServices()

    expect(services.every(({ state }) => state === "up")).toBe(true)
    expect(services.every(({ latencyMs }) => typeof latencyMs === "number" && latencyMs >= 0)).toBe(true)
    expect(services.every(({ checkedAt }) => !Number.isNaN(Date.parse(checkedAt)))).toBe(true)
    expect(summary).toEqual({ total: 5, up: 5, degraded: 0, down: 0, downServices: [] })
    // core-backend n'est pas appelé par le réseau ; chaque appel porte un délai
    expect(calls.map(({ url }) => url).sort()).toEqual([
        "http://backtest/readiness",
        "http://market/readiness",
        "http://notification/readiness",
        "http://risk/readiness",
    ])
    expect(calls.every(({ signal }) => signal instanceof AbortSignal)).toBe(true)
})

test("lignes dans l'ordre de MONITORED_SERVICES, quel que soit l'ordre des réponses", async () => {
    const { service } = setup()
    const slow = service.fetch
    // market-service répond en dernier
    service.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        if (String(input).includes("market")) await Bun.sleep(20)
        return slow(input, init)
    }) as typeof fetch

    const { services } = await service.getServices()

    expect(services.map(({ service: name }) => name)).toEqual([...MONITORED_SERVICES])
})

test("503 : degraded avec les checks de la réponse", async () => {
    const { service } = setup({ market: { status: 503, body: { status: "unavailable", checks: { provider: "down" } } } })
    const { services, summary } = await service.getServices()

    const market = services.find(({ service: name }) => name === "market-service")!
    expect(market.state).toBe("degraded")
    expect(market.checks).toEqual({ provider: "down" })
    expect(market.latencyMs).not.toBeNull()
    expect(summary).toEqual({ total: 5, up: 4, degraded: 1, down: 0, downServices: [] })
})

test("core-backend dont une dépendance est KO : degraded, sondé sans appel réseau", async () => {
    const { service } = setup({}, false)
    const { services } = await service.getServices()

    expect(services[0]).toMatchObject({ service: "core-backend", state: "degraded", checks: { database: "down", kafka: "ok" } })
})

test("délai dépassé : down sans checks ni latence", async () => {
    const { service } = setup({ risk: timeout() })
    const { services, summary } = await service.getServices()

    expect(services.find(({ service: name }) => name === "risk-engine")).toEqual({
        service: "risk-engine",
        state: "down",
        latencyMs: null,
        checkedAt: expect.any(String),
    })
    expect(summary).toEqual({ total: 5, up: 4, degraded: 0, down: 1, downServices: ["risk-engine"] })
})

test("connexion refusée : down", async () => {
    const { service } = setup({ notification: refused() })
    const { services } = await service.getServices()

    const notification = services.find(({ service: name }) => name === "notification-service")!
    expect(notification.state).toBe("down")
    expect(notification.checks).toBeUndefined()
    expect(notification.latencyMs).toBeNull()
})

test("corps non conforme au contrat ou statut inattendu : down", async () => {
    const { service } = setup({
        market: { status: 200, body: { status: "ok" } },
        backtest: { status: 404, body: { error: "Not found" } },
    })
    const { services } = await service.getServices()

    expect(services.find(({ service: name }) => name === "market-service")!.state).toBe("down")
    expect(services.find(({ service: name }) => name === "backtest-engine")!.state).toBe("down")
})

test("synthèse : compteurs par état et services down dans l'ordre de MONITORED_SERVICES", async () => {
    const { service } = setup({
        risk: timeout(),
        market: refused(),
        notification: { status: 503, body: { status: "unavailable", checks: { database: "down", kafka: "ok" } } },
    })
    const { summary } = await service.getServices()

    expect(summary).toEqual({ total: 5, up: 2, degraded: 1, down: 2, downServices: ["market-service", "risk-engine"] })
})
