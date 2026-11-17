import { expect, test } from "bun:test"
import NotificationConsumer from "../consumers/notification.consumer"
import type NotificationService from "../services/notification.service"

const context = { topic: "notification.requested" } as never

const event = (payload: object) => ({ eventId: "e", eventType: "notification.requested", occurredAt: "2026-11-17T10:00:00.000Z", version: 1, payload })

test("message valide : le service enregistre le payload", async () => {
    const recorded: unknown[] = []
    const service = { record: async (payload: unknown) => void recorded.push(payload) } as unknown as NotificationService
    const payload = {
        userId: "u1",
        type: "BACKTEST_FAILED",
        dedupKey: "BACKTEST_FAILED:x",
        occurredAt: "2026-11-17T10:00:00.000Z",
        params: { backtestId: "b", name: "N", errorCode: "ENGINE_FAILED" },
    }

    await new NotificationConsumer(service).handle(event(payload), context)

    expect(recorded).toEqual([payload])
})

test("message invalide : ignoré sans exception ni enregistrement", async () => {
    let calls = 0
    const service = { record: async () => void calls++ } as unknown as NotificationService

    await new NotificationConsumer(service).handle(event({ type: "UNKNOWN" }), context)

    expect(calls).toBe(0)
})

test("le service qui lève (base indisponible) laisse remonter l'erreur", async () => {
    const service = { record: async () => { throw new Error("db down") } } as unknown as NotificationService
    const payload = { userId: "u", type: "BACKTEST_FAILED", dedupKey: "k", occurredAt: "2026-11-17T10:00:00.000Z", params: { backtestId: "b", name: "N", errorCode: null } }

    await expect(new NotificationConsumer(service).handle(event(payload), context)).rejects.toThrow("db down")
})
