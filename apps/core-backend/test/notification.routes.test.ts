import { afterAll, beforeAll, expect, test } from "bun:test"
import { startApp } from "@azimut/http/testing"
import createNotificationRoutes from "../routes/notification/notification.routes"

let app: Awaited<ReturnType<typeof startApp>>
beforeAll(async () => {
    app = await startApp(createNotificationRoutes())
})
afterAll(() => app.close())

test("le proxy relaie les routes de D9 et des préférences, rien d'autre", () => {
    expect(createNotificationRoutes().map((route) => `${route.method} ${route.path}`)).toEqual([
        "get /api/notifications",
        "get /api/notifications/unread-count",
        "get /api/notifications/stream",
        "post /api/notifications/read-all",
        "get /api/notifications/preferences",
        "put /api/notifications/preferences",
        "post /api/notifications/:id/read",
    ])
})

test("sans session, chaque route répond 401, flux compris", async () => {
    for (const [method, path] of [
        ["GET", "/api/notifications"],
        ["GET", "/api/notifications/unread-count"],
        ["GET", "/api/notifications/stream"],
        ["POST", "/api/notifications/read-all"],
        ["GET", "/api/notifications/preferences"],
        ["PUT", "/api/notifications/preferences"],
        ["POST", "/api/notifications/abc/read"],
    ] as const) {
        const response = await app.request(path, { method })
        expect(response.status).toBe(401)
    }
})

test("une route hors liste blanche n'est pas relayée (404)", async () => {
    expect((await app.request("/api/notifications/abc", { method: "DELETE" })).status).toBe(404)
})
