import { afterAll, beforeAll, expect, test } from "bun:test"
import type { Server } from "node:http"
import express from "express"
import { INTERNAL_KEY_HEADER } from "@azimut/contracts"
import { registerProbes } from "@azimut/http"
import { startApp } from "@azimut/http/testing"
import internalAuthMiddleware from "../middleware/internal-auth.middleware"
import { env } from "../env"

let app: Awaited<ReturnType<typeof startApp>>
beforeAll(async () => {
    app = await startApp([
        { method: "get", path: "/ping", middlewares: [internalAuthMiddleware], handler: (_req, res) => void res.json({ userId: res.locals.userId }) },
    ])
})
afterAll(() => app.close())

test("sans clé interne : 401", async () => {
    expect((await app.request("/ping", { headers: { "x-user-id": "u1" } })).status).toBe(401)
})

test("clé erronée : 401", async () => {
    expect((await app.request("/ping", { headers: { [INTERNAL_KEY_HEADER]: "x".repeat(22), "x-user-id": "u1" } })).status).toBe(401)
})

test("clé valide sans x-user-id : 401", async () => {
    expect((await app.request("/ping", { headers: { [INTERNAL_KEY_HEADER]: env.INTERNAL_API_KEY } })).status).toBe(401)
})

test("clé valide et x-user-id : passe, l'utilisateur est dans res.locals", async () => {
    const response = await app.request("/ping", { headers: { [INTERNAL_KEY_HEADER]: env.INTERNAL_API_KEY, "x-user-id": "u1" } })
    expect(await response.json()).toEqual({ userId: "u1" })
})

// Même ordre que `index.ts` : sondes, puis middleware interne, puis routes protégées (contrôles factices : aucune base ni Kafka)
let probes: { url: string; server: Server }
beforeAll(async () => {
    const probeApp = express()
    registerProbes(probeApp, [
        { name: "database", check: () => true },
        { name: "kafka", check: () => true },
    ])
    probeApp.use(internalAuthMiddleware)
    probeApp.get("/api/notifications", (_req, res) => void res.json([]))
    const server: Server = await new Promise((resolve) => {
        const listening = probeApp.listen(0, () => resolve(listening))
    })
    probes = { url: `http://localhost:${(server.address() as { port: number }).port}`, server }
})
afterAll(() => new Promise<void>((resolve) => probes.server.close(() => resolve())))

test("/liveness et /readiness répondent sans clé interne ni x-user-id", async () => {
    for (const path of ["/liveness", "/readiness"]) {
        expect((await fetch(`${probes.url}${path}`)).status).toBe(200)
    }
})

test("les sondes n'ouvrent pas les autres routes : sans clé, 401", async () => {
    expect((await fetch(`${probes.url}/api/notifications`)).status).toBe(401)
})
