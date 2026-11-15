import { afterAll, beforeAll, beforeEach, expect, spyOn, test } from "bun:test"
import { ForbiddenError } from "@azimut/http"
import { startApp } from "@azimut/http/testing"
import { auth } from "../lib/auth"
import createRiskRoutes from "../routes/risk/risk.routes"
import RiskService from "../services/risk.service"

let signedIn = true
const spies = [spyOn(auth.api, "getSession").mockImplementation((async () => (signedIn ? { user: { id: "u1" } } : null)) as never)]
const get = spyOn(RiskService.prototype, "get")
const setLimit = spyOn(RiskService.prototype, "setLimit")
spies.push(get as never, setLimit as never)

let app: Awaited<ReturnType<typeof startApp>>
beforeAll(async () => {
    app = await startApp(createRiskRoutes())
})
afterAll(async () => {
    await app.close()
    spies.forEach((spy) => spy.mockRestore())
})
beforeEach(() => {
    signedIn = true
    get.mockReset()
    setLimit.mockReset()
})

const put = (limit: unknown) => app.request("/api/risk/b1/constraint", { method: "PUT", body: JSON.stringify({ maxDrawdownLimit: limit }) })

test("sans session : 401 sur chaque route", async () => {
    signedIn = false

    for (const [method, path] of [["GET", "/api/risk/b1"], ["PUT", "/api/risk/b1/constraint"]] as const) {
        const response = await app.request(path, { method })
        expect(response.status).toBe(401)
    }
})

test("GET /api/risk/:backtestId : le service reçoit l'id et l'utilisateur", async () => {
    get.mockResolvedValue({ state: "UNAVAILABLE", risk: null, reading: null, constraint: null })

    const response = await app.request("/api/risk/b1")

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ state: "UNAVAILABLE" })
    expect(get.mock.calls[0]).toEqual(["b1", "u1"])
})

test("GET d'un autre propriétaire : 403", async () => {
    get.mockRejectedValue(new ForbiddenError())

    expect((await app.request("/api/risk/b1")).status).toBe(403)
})

test("PUT avec une limite valide : le service reçoit le ratio", async () => {
    setLimit.mockResolvedValue({ state: "UNAVAILABLE", risk: null, reading: null, constraint: null })

    const response = await put(0.15)

    expect(response.status).toBe(200)
    expect(setLimit.mock.calls[0]).toEqual(["b1", "u1", 0.15])
})

test("PUT hors plage ou non entier en pourcent : 400 INVALID_RISK_LIMIT, seuil inchangé", async () => {
    for (const limit of [0, 1, 0.005, 0.155, 1.5, "15", null]) {
        const response = await put(limit)
        expect(response.status).toBe(400)
        expect(await response.json()).toMatchObject({ code: "INVALID_RISK_LIMIT" })
    }
    expect((await app.request("/api/risk/b1/constraint", { method: "PUT", body: "{}" })).status).toBe(400)
    expect(setLimit).not.toHaveBeenCalled()
})
