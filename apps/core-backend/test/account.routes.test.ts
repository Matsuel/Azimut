import { afterAll, beforeAll, expect, spyOn, test } from "bun:test"
import { auth } from "../lib/auth"
import createAccountRoutes from "../routes/account/account.routes"
import AccountService from "../services/account.service"
import { startApp } from "@azimut/http/testing"

const session = spyOn(auth.api, "getSession").mockImplementation((async () => ({ user: { id: "u1" } })) as never)
const resetData = spyOn(AccountService.prototype, "resetData").mockResolvedValue(undefined)

let app: Awaited<ReturnType<typeof startApp>>
beforeAll(async () => {
    app = await startApp(createAccountRoutes())
})
afterAll(async () => {
    await app.close()
    session.mockRestore()
    resetData.mockRestore()
})

test("POST /api/account/reset : 204, l'utilisateur vient de la session et non du corps", async () => {
    const response = await app.request("/api/account/reset", { method: "POST", body: JSON.stringify({ userId: "u2" }) })

    expect(response.status).toBe(204)
    expect(resetData).toHaveBeenCalledWith("u1")
})

test("POST /api/account/reset sans session : 401, rien n'est supprimé", async () => {
    resetData.mockClear()
    session.mockResolvedValueOnce(null as never)

    const response = await app.request("/api/account/reset", { method: "POST" })

    expect(response.status).toBe(401)
    expect(resetData).not.toHaveBeenCalled()
})
