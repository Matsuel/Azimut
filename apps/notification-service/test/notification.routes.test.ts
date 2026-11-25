import { afterAll, beforeAll, expect, spyOn, test } from "bun:test"
import { INTERNAL_KEY_HEADER, API_ERROR_CODES, type NotificationList } from "@azimut/contracts"
import { NotFoundError } from "@azimut/http"
import { startApp } from "@azimut/http/testing"
import internalAuthMiddleware from "../middleware/internal-auth.middleware"
import createNotificationRoutes from "../routes/notification/notification.routes"
import NotificationService from "../services/notification.service"
import { env } from "../env"

const list: NotificationList = {
    data: [],
    count: 0,
    page: 1,
    pageSize: 20,
    counts: { all: 0, unread: 0, BACKTESTS: 0, RISK: 0 },
    retentionDays: 90,
}
const listSpy = spyOn(NotificationService.prototype, "list").mockResolvedValue(list)
const unreadSpy = spyOn(NotificationService.prototype, "countUnread").mockResolvedValue(3)
const readSpy = spyOn(NotificationService.prototype, "markRead").mockResolvedValue()
const readAllSpy = spyOn(NotificationService.prototype, "markAllRead").mockResolvedValue()

let app: Awaited<ReturnType<typeof startApp>>
beforeAll(async () => {
    app = await startApp(createNotificationRoutes().map((route) => ({ ...route, middlewares: [internalAuthMiddleware] })))
})
afterAll(async () => {
    await app.close()
    for (const spy of [listSpy, unreadSpy, readSpy, readAllSpy]) spy.mockRestore()
})

const headers = { [INTERNAL_KEY_HEADER]: env.INTERNAL_API_KEY, "x-user-id": "u1" }

test("sans clé interne : 401", async () => {
    expect((await app.request("/api/notifications")).status).toBe(401)
})

test("GET /api/notifications : filtres et pagination transmis, userId pris de x-user-id", async () => {
    const response = await app.request("/api/notifications?category=RISK&unread=true&page=2&pageSize=5", { headers })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(list)
    expect(listSpy.mock.calls.at(-1)).toEqual(["u1", { category: "RISK", unread: true }, { page: 2, pageSize: 5 }])
})

test("GET /api/notifications : catégorie inconnue → 400 INVALID_QUERY", async () => {
    const response = await app.request("/api/notifications?category=NOPE", { headers })

    expect(response.status).toBe(400)
    expect(((await response.json()) as { code: string }).code).toBe("INVALID_QUERY")
})

test("GET /api/notifications/unread-count : 200 { count }", async () => {
    const response = await app.request("/api/notifications/unread-count", { headers })

    expect(await response.json()).toEqual({ count: 3 })
    expect(unreadSpy.mock.calls.at(-1)).toEqual(["u1"])
})

test("POST /api/notifications/:id/read : 204, userId de l'en-tête", async () => {
    const response = await app.request("/api/notifications/n1/read", { method: "POST", headers })

    expect(response.status).toBe(204)
    expect(readSpy.mock.calls.at(-1)).toEqual(["n1", "u1"])
})

test("POST /api/notifications/:id/read : notification d'un autre utilisateur → 404", async () => {
    readSpy.mockRejectedValueOnce(new NotFoundError(API_ERROR_CODES.NOTIFICATION_NOT_FOUND))

    const response = await app.request("/api/notifications/other/read", { method: "POST", headers })

    expect(response.status).toBe(404)
    expect(((await response.json()) as { code: string }).code).toBe("NOTIFICATION_NOT_FOUND")
})

test("POST /api/notifications/read-all : 204", async () => {
    const response = await app.request("/api/notifications/read-all", { method: "POST", headers })

    expect(response.status).toBe(204)
    expect(readAllSpy.mock.calls.at(-1)).toEqual(["u1"])
})

test("GET /api/notifications/preferences : 200, userId de l'en-tête, pas capturée par /:id/read", async () => {
    const spy = spyOn(NotificationService.prototype, "getPreferences").mockResolvedValue({ BACKTESTS: true, RISK: false })

    const response = await app.request("/api/notifications/preferences", { headers })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ BACKTESTS: true, RISK: false })
    expect(spy.mock.calls.at(-1)).toEqual(["u1"])
    spy.mockRestore()
})

test("PUT /api/notifications/preferences : mise à jour partielle, userId jamais du corps", async () => {
    const spy = spyOn(NotificationService.prototype, "updatePreferences").mockResolvedValue({ BACKTESTS: false, RISK: true })

    const response = await app.request("/api/notifications/preferences", {
        method: "PUT",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ BACKTESTS: false, userId: "intrus" }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ BACKTESTS: false, RISK: true })
    expect(spy.mock.calls.at(-1)?.[0]).toBe("u1")
    expect(spy.mock.calls.at(-1)?.[1]).toEqual({ BACKTESTS: false })
    spy.mockRestore()
})

test("PUT /api/notifications/preferences : corps vide ou invalide → 400 INVALID_BODY", async () => {
    for (const body of [{}, { RISK: "oui" }]) {
        const response = await app.request("/api/notifications/preferences", {
            method: "PUT",
            headers: { ...headers, "content-type": "application/json" },
            body: JSON.stringify(body),
        })
        expect(response.status).toBe(400)
        expect(((await response.json()) as { code: string }).code).toBe("INVALID_BODY")
    }
})
