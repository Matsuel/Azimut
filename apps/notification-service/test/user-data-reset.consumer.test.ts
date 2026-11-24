import { expect, test } from "bun:test"
import UserDataResetConsumer from "../consumers/user-data-reset.consumer"
import type NotificationService from "../services/notification.service"

const context = { topic: "user.data.reset" } as never

const event = (payload: object) => ({ eventId: "e", eventType: "user.data.reset", occurredAt: "2026-11-25T10:00:00.000Z", version: 1, payload })

test("message valide : le service réinitialise les données de l'utilisateur", async () => {
    const reset: string[] = []
    const service = { resetUserData: async (userId: string) => void reset.push(userId) } as unknown as NotificationService

    await new UserDataResetConsumer(service).handle(event({ userId: "u1" }), context)

    expect(reset).toEqual(["u1"])
})

test("message invalide : ignoré sans exception ni suppression", async () => {
    let calls = 0
    const service = { resetUserData: async () => void calls++ } as unknown as NotificationService

    await new UserDataResetConsumer(service).handle(event({ userId: "" }), context)
    await new UserDataResetConsumer(service).handle({ nope: true }, context)

    expect(calls).toBe(0)
})

test("le service qui lève (base indisponible) laisse remonter l'erreur", async () => {
    const service = { resetUserData: async () => { throw new Error("db down") } } as unknown as NotificationService

    await expect(new UserDataResetConsumer(service).handle(event({ userId: "u1" }), context)).rejects.toThrow("db down")
})
