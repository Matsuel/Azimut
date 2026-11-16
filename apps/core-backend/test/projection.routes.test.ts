import { afterAll, beforeAll, beforeEach, expect, spyOn, test } from "bun:test"
import { ForbiddenError } from "@azimut/http"
import { startApp } from "@azimut/http/testing"
import { auth } from "../lib/auth"
import createProjectionRoutes from "../routes/projection/projection.routes"
import ProjectionService from "../services/projection.service"

let signedIn = true
const spies = [spyOn(auth.api, "getSession").mockImplementation((async () => (signedIn ? { user: { id: "u1" } } : null)) as never)]
const get = spyOn(ProjectionService.prototype, "get")
spies.push(get as never)

let app: Awaited<ReturnType<typeof startApp>>
beforeAll(async () => {
    app = await startApp(createProjectionRoutes())
})
afterAll(async () => {
    await app.close()
    spies.forEach((spy) => spy.mockRestore())
})
beforeEach(() => {
    signedIn = true
    get.mockReset()
})

test("sans session : 401", async () => {
    signedIn = false

    expect((await app.request("/api/projection/b1")).status).toBe(401)
})

test("GET /api/projection/:backtestId : le service reçoit l'id et l'utilisateur, la vue est renvoyée", async () => {
    get.mockResolvedValue({ state: "UNAVAILABLE", projection: null })

    const response = await app.request("/api/projection/b1")

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ state: "UNAVAILABLE", projection: null })
    expect(get.mock.calls[0]).toEqual(["b1", "u1"])
})

test("GET d'un autre propriétaire : 403", async () => {
    get.mockRejectedValue(new ForbiddenError())

    expect((await app.request("/api/projection/b1")).status).toBe(403)
})
