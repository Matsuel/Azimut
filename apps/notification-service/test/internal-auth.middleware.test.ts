import { afterAll, beforeAll, expect, test } from "bun:test"
import { INTERNAL_KEY_HEADER } from "@azimut/contracts"
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
