import { afterAll, beforeAll, beforeEach, expect, spyOn, test } from "bun:test"
import type { MonitoringServicesResponse } from "@azimut/contracts"
import { startApp } from "@azimut/http/testing"
import { auth } from "../lib/auth"
import createMonitoringRoutes from "../routes/monitoring/monitoring.routes"
import MonitoringService from "../services/monitoring.service"

let role: string | null = "admin"
let signedIn = true
const getSession = spyOn(auth.api, "getSession").mockImplementation((async () => (signedIn ? { user: { id: "u1", role } } : null)) as never)
const getServices = spyOn(MonitoringService.prototype, "getServices")

const response: MonitoringServicesResponse = {
    services: [{ service: "core-backend", state: "up", checks: { database: "ok", kafka: "ok" }, latencyMs: 3, checkedAt: "2026-11-19T10:00:00.000Z" }],
    summary: { total: 1, up: 1, degraded: 0, down: 0, downServices: [] },
}

let app: Awaited<ReturnType<typeof startApp>>
beforeAll(async () => {
    app = await startApp(createMonitoringRoutes())
})
afterAll(async () => {
    await app.close()
    getSession.mockRestore()
    getServices.mockRestore()
})
beforeEach(() => {
    signedIn = true
    role = "admin"
    getSession.mockClear()
    getServices.mockReset()
    getServices.mockResolvedValue(response)
})

const get = () => app.request("/api/admin/monitoring/services")

test("sans session : 401, aucune sonde interrogée", async () => {
    signedIn = false

    expect((await get()).status).toBe(401)
    expect(getServices).not.toHaveBeenCalled()
})

test("compte non administrateur : 403, aucune sonde interrogée", async () => {
    role = "user"

    expect((await get()).status).toBe(403)
    expect(getServices).not.toHaveBeenCalled()
})

test("administrateur : 200 avec l'état calculé par le service, session relue sans cache", async () => {
    const res = await get()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(response)
    expect(getSession.mock.calls[0]?.[0]).toMatchObject({ query: { disableCookieCache: true } })
})
