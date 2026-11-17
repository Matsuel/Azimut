import { afterAll, beforeAll, expect, test } from "bun:test"
import type { NotificationView } from "@azimut/contracts"
import { INTERNAL_KEY_HEADER } from "@azimut/contracts"
import { startApp } from "@azimut/http/testing"
import internalAuthMiddleware from "../middleware/internal-auth.middleware"
import createNotificationRoutes from "../routes/notification/notification.routes"
import NotificationStreamService, { notificationStream } from "../services/notification-stream.service"
import { env } from "../env"

const view = (id: string): NotificationView => ({
    id,
    type: "BACKTEST_FAILED",
    category: "BACKTESTS",
    params: { backtestId: "b", name: "N", errorCode: null },
    createdAt: "2026-11-17T10:00:00.000Z",
    readAt: null,
})

test("publish : seul l'abonné du propriétaire reçoit, plusieurs onglets reçoivent tous", () => {
    const stream = new NotificationStreamService()
    const u1a: string[] = []
    const u1b: string[] = []
    const u2: string[] = []
    stream.subscribe("u1", (n) => u1a.push(n.id))
    stream.subscribe("u1", (n) => u1b.push(n.id))
    stream.subscribe("u2", (n) => u2.push(n.id))

    stream.publish("u1", view("n1"))

    expect(u1a).toEqual(["n1"])
    expect(u1b).toEqual(["n1"])
    expect(u2).toEqual([])
})

test("subscribe : la fonction renvoyée libère l'abonné", () => {
    const stream = new NotificationStreamService()
    const received: string[] = []
    const unsubscribe = stream.subscribe("u1", (n) => received.push(n.id))

    unsubscribe()
    stream.publish("u1", view("n1"))

    expect(received).toEqual([])
})

let app: Awaited<ReturnType<typeof startApp>>
beforeAll(async () => {
    app = await startApp(createNotificationRoutes().map((route) => ({ ...route, middlewares: [internalAuthMiddleware] })))
})
afterAll(() => app.close())

/** Lit le flux jusqu'à trouver `needle` dans le texte reçu. */
async function readUntil(reader: Pick<ReadableStreamDefaultReader<Uint8Array>, "read">, needle: string) {
    const decoder = new TextDecoder()
    let text = ""
    while (!text.includes(needle)) {
        const { value, done } = await reader.read()
        if (done) break
        text += decoder.decode(value)
    }
    return text
}

test("GET /api/notifications/stream : text/event-stream, événement reçu par son seul propriétaire", async () => {
    const headers = { [INTERNAL_KEY_HEADER]: env.INTERNAL_API_KEY }
    const controller = new AbortController()
    const mine = await app.request("/api/notifications/stream", { headers: { ...headers, "x-user-id": "u1" }, signal: controller.signal })
    const other = await app.request("/api/notifications/stream", { headers: { ...headers, "x-user-id": "u2" }, signal: controller.signal })
    expect(mine.headers.get("content-type")).toContain("text/event-stream")
    const mineReader = mine.body!.getReader()
    const otherReader = other.body!.getReader()
    await readUntil(mineReader, ": connected")
    await readUntil(otherReader, ": connected")

    notificationStream.publish("u1", view("n1"))
    const text = await readUntil(mineReader, "\n\n")

    expect(text).toContain("event: notification")
    expect(text).toContain(`data: ${JSON.stringify(view("n1"))}`)
    // u2 n'a rien reçu : son prochain événement est le sien
    notificationStream.publish("u2", view("n2"))
    const otherText = await readUntil(otherReader, "\n\n")
    expect(otherText).toContain('"id":"n2"')
    expect(otherText).not.toContain('"id":"n1"')

    controller.abort()
})

test("GET /api/notifications/stream : sans x-user-id → 401", async () => {
    const response = await app.request("/api/notifications/stream", { headers: { [INTERNAL_KEY_HEADER]: env.INTERNAL_API_KEY } })

    expect(response.status).toBe(401)
})
