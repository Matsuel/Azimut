import { afterAll, beforeAll, expect, spyOn, test } from "bun:test"
import { ForbiddenError } from "@azimut/http"
import { auth } from "../lib/auth"
import createPortfolioRoutes from "../routes/portfolio/portfolio.routes"
import PortfolioService from "../services/portfolio.service"
import { startApp } from "@azimut/http/testing"

const spies = [
    spyOn(auth.api, "getSession").mockImplementation((async () => ({ user: { id: "u1" } })) as never),
    spyOn(PortfolioService.prototype, "create").mockResolvedValue({ id: "p1" } as never),
    spyOn(PortfolioService.prototype, "getById").mockRejectedValue(new ForbiddenError()),
    spyOn(PortfolioService.prototype, "getAll").mockResolvedValue({ data: [], count: 0, page: 1, pageSize: 10 } as never),
    spyOn(PortfolioService.prototype, "update").mockResolvedValue({ id: "p1", name: "Retraite" } as never),
    spyOn(PortfolioService.prototype, "delete").mockResolvedValue(undefined),
]

let app: Awaited<ReturnType<typeof startApp>>
beforeAll(async () => {
    app = await startApp(createPortfolioRoutes())
})
afterAll(async () => {
    await app.close()
    spies.forEach((spy) => spy.mockRestore())
})

test("POST /api/portfolio sans nom : 400 NAME_REQUIRED", async () => {
    const response = await app.request("/api/portfolio", { method: "POST", body: JSON.stringify({}) })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "NAME_REQUIRED" })
})

test("POST /api/portfolio avec un nom : 201", async () => {
    const response = await app.request("/api/portfolio", { method: "POST", body: JSON.stringify({ name: "Principal" }) })

    expect(response.status).toBe(201)
})

test("GET /api/portfolio/:id d'un autre utilisateur : 403 ACCESS_DENIED", async () => {
    const response = await app.request("/api/portfolio/p1")

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ code: "ACCESS_DENIED" })
})

test("GET /api/portfolio : liste paginée de l'utilisateur", async () => {
    const response = await app.request("/api/portfolio?page=1&pageSize=10")

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ data: [], count: 0 })
    expect(PortfolioService.prototype.getAll).toHaveBeenCalledWith("u1", { page: 1, pageSize: 10 })
})

test("GET /api/portfolio avec une pagination invalide : 400 INVALID_QUERY", async () => {
    const response = await app.request("/api/portfolio?page=0")

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "INVALID_QUERY" })
})

test("PATCH /api/portfolio/:id sans nom : 400 NAME_REQUIRED", async () => {
    const response = await app.request("/api/portfolio/p1", { method: "PATCH", body: JSON.stringify({}) })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "NAME_REQUIRED" })
})

test("PATCH /api/portfolio/:id avec un nom : 200 et portefeuille renommé", async () => {
    const response = await app.request("/api/portfolio/p1", { method: "PATCH", body: JSON.stringify({ name: "Retraite" }) })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ name: "Retraite" })
})

test("DELETE /api/portfolio/:id : 204", async () => {
    const response = await app.request("/api/portfolio/p1", { method: "DELETE" })

    expect(response.status).toBe(204)
    expect(PortfolioService.prototype.delete).toHaveBeenCalledWith("p1", "u1")
})
