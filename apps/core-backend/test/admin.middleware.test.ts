import { afterEach, expect, spyOn, test } from "bun:test"
import type { NextFunction, Request, Response } from "express"
import { ForbiddenError, UnauthorizedError } from "@azimut/http"
import { auth } from "../lib/auth"
import { freshAuthMiddleware } from "../middleware/auth.middleware"
import requireAdmin from "../middleware/admin.middleware"

const response = {} as Response

const getSession = spyOn(auth.api, "getSession")
afterEach(() => getSession.mockReset())

// Chaîne réelle des routes admin : freshAuthMiddleware lit la session sans cache, requireAdmin s'arrête à la première erreur
const run = async (req: Partial<Request> = {}) => {
    const calls: unknown[] = []
    const request = { headers: {}, ...req } as Request
    const next = ((error?: unknown) => calls.push(error)) as NextFunction
    await freshAuthMiddleware(request, response, next)
    if (calls[0] === undefined) requireAdmin(request, response, next)
    return calls
}

test("sans session : UnauthorizedError", async () => {
    getSession.mockResolvedValue(null as never)

    const calls = await run()

    expect(calls).toHaveLength(1)
    expect(calls[0]).toBeInstanceOf(UnauthorizedError)
})

test("requireAdmin seul, sans authMiddleware : UnauthorizedError", () => {
    const calls: unknown[] = []

    requireAdmin({ headers: {} } as Request, response, ((error?: unknown) => calls.push(error)) as NextFunction)

    expect(calls[0]).toBeInstanceOf(UnauthorizedError)
})

test("session sans rôle administrateur : ForbiddenError", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", role: "user" } } as never)

    const calls = await run()

    expect(calls[1]).toBeInstanceOf(ForbiddenError)
})

test("session sans rôle : ForbiddenError", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", role: null } } as never)

    const calls = await run()

    expect(calls[1]).toBeInstanceOf(ForbiddenError)
})

test("le rôle du body ou de la query est ignoré", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", role: "user" } } as never)

    const calls = await run({ body: { role: "admin" }, query: { role: "admin" } })

    expect(calls[1]).toBeInstanceOf(ForbiddenError)
})

test("administrateur : la requête passe, une seule lecture de session", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", role: "user, admin" } } as never)

    const calls = await run()

    expect(calls).toEqual([undefined, undefined])
    expect(getSession).toHaveBeenCalledTimes(1)
})

test("routes admin : la session est relue sans cache (rôle retiré pris en compte aussitôt)", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", role: "admin" } } as never)

    await run()

    expect(getSession.mock.calls[0]?.[0]).toMatchObject({ query: { disableCookieCache: true } })
})
