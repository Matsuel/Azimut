import { expect, test } from "bun:test"
import type { NotificationRequestedPayload } from "@azimut/contracts"
import type { Notification } from "../generated/prisma/client"
import type { INotificationRepository } from "../repositories/notification.repository"
import type { CreateNotificationDTO } from "../interfaces/notification.interface"
import NotificationService from "../services/notification.service"

const payload: NotificationRequestedPayload = {
    userId: "u1",
    type: "RISK_CONSTRAINT_VIOLATED",
    dedupKey: "RISK_CONSTRAINT_VIOLATED:b:0.15",
    occurredAt: "2026-11-17T10:00:00.000Z",
    params: { backtestId: "b", name: "N", maxDrawdown: 0.3, limit: 0.15 },
}

/** Faux repository en mémoire : `create` refuse une dedupKey déjà vue, comme la contrainte unique. */
function fakeRepo() {
    const rows = new Map<string, Notification>()
    const repo = {
        create: async (data: CreateNotificationDTO) => {
            if (rows.has(data.dedupKey)) return null
            const row = { id: `id-${rows.size}`, ...data, params: data.params, readAt: null } as Notification
            rows.set(data.dedupKey, row)
            return row
        },
    } as unknown as INotificationRepository
    return { repo, rows }
}

test("record : enregistre avec la catégorie déduite du type et renvoie la vue", async () => {
    const { repo, rows } = fakeRepo()
    const service = new NotificationService()
    service.repo = repo

    const view = await service.record(payload)

    expect(rows.get(payload.dedupKey)?.category).toBe("RISK")
    expect(view).toMatchObject({ type: "RISK_CONSTRAINT_VIOLATED", category: "RISK", readAt: null, createdAt: payload.occurredAt })
})

test("record : un rejeu (même dedupKey) n'insère rien et renvoie null", async () => {
    const { repo, rows } = fakeRepo()
    const service = new NotificationService()
    service.repo = repo

    await service.record(payload)

    expect(await service.record(payload)).toBeNull()
    expect(rows.size).toBe(1)
})

test("record : une base indisponible lève (kafkajs rejoue)", async () => {
    const service = new NotificationService()
    service.repo = { create: async () => { throw new Error("db down") } } as unknown as INotificationRepository

    await expect(service.record(payload)).rejects.toThrow("db down")
})
