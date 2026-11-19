import { afterAll, beforeAll, expect, test } from "bun:test"
import express from "express"
import type { Server } from "node:http"
import { registerProbes, runReadiness, startProbeServer, type ProbeCheck } from "../src"

test("runReadiness : tous les contrôles OK → 200 ok", async () => {
    const result = await runReadiness([
        { name: "database", check: async () => true },
        { name: "kafka", check: () => true },
    ])
    expect(result).toEqual({ httpStatus: 200, body: { status: "ok", checks: { database: "ok", kafka: "ok" } } })
})

test("runReadiness : un contrôle KO → 503 unavailable, détail par dépendance", async () => {
    const result = await runReadiness([
        { name: "database", check: async () => true },
        { name: "kafka", check: () => false },
    ])
    expect(result).toEqual({ httpStatus: 503, body: { status: "unavailable", checks: { database: "ok", kafka: "down" } } })
})

test("runReadiness : un contrôle qui lève → down et 503, sans propager l'exception", async () => {
    const result = await runReadiness([
        {
            name: "provider",
            check: async () => {
                throw new Error("timeout")
            },
        },
    ])
    expect(result).toEqual({ httpStatus: 503, body: { status: "unavailable", checks: { provider: "down" } } })
})

test("runReadiness : aucun contrôle → 200 et checks vide", async () => {
    expect(await runReadiness([])).toEqual({ httpStatus: 200, body: { status: "ok", checks: {} } })
})

let calls = 0
const failing: ProbeCheck[] = [
    {
        name: "kafka",
        check: () => {
            calls++
            return false
        },
    },
]

let server: Server
let base: string
beforeAll(async () => {
    const app = express()
    registerProbes(app, failing)
    server = await new Promise((resolve) => {
        const listening = app.listen(0, () => resolve(listening))
    })
    base = `http://localhost:${(server.address() as { port: number }).port}`
})
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

test("registerProbes : liveness 200 sans appeler aucun contrôle, readiness 503", async () => {
    calls = 0
    const liveness = await fetch(`${base}/liveness`)
    expect(liveness.status).toBe(200)
    expect(await liveness.json()).toEqual({ status: "ok" })
    expect(calls).toBe(0)

    const readiness = await fetch(`${base}/readiness`)
    expect(readiness.status).toBe(503)
    expect(await readiness.json()).toEqual({ status: "unavailable", checks: { kafka: "down" } })
    expect(calls).toBe(1)
})

test("startProbeServer : port 0, les deux sondes répondent, 404 ailleurs", async () => {
    const probes = await startProbeServer(0, [{ name: "kafka", check: () => true }])
    try {
        const url = `http://localhost:${probes.port}`
        const liveness = await fetch(`${url}/liveness`)
        expect(liveness.status).toBe(200)
        expect(await liveness.json()).toEqual({ status: "ok" })

        const readiness = await fetch(`${url}/readiness?probe=k8s`)
        expect(readiness.status).toBe(200)
        expect(await readiness.json()).toEqual({ status: "ok", checks: { kafka: "ok" } })

        expect((await fetch(`${url}/health`)).status).toBe(404)
    } finally {
        await probes.close()
    }
})
