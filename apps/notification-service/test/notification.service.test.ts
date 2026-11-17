import { expect, test } from "bun:test"
import type { NotificationRequestedPayload } from "@azimut/contracts"
import type { Notification } from "../generated/prisma/client"
import type { INotificationRepository } from "../repositories/notification.repository"
import type { CreateNotificationDTO } from "../interfaces/notification.interface"
import NotificationService from "../services/notification.service"
import NotificationStreamService from "../services/notification-stream.service"

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

test("list : assemble la page, les nombres des onglets et la rétention", async () => {
    const service = new NotificationService()
    service.repo = {
        list: async () => ({ data: [], count: 0 }),
        counts: async () => ({ all: 4, unread: 2, BACKTESTS: 3, RISK: 1 }),
    } as unknown as INotificationRepository

    expect(await service.list("u1", {}, { page: 1, pageSize: 20 })).toEqual({
        data: [],
        count: 0,
        page: 1,
        pageSize: 20,
        counts: { all: 4, unread: 2, BACKTESTS: 3, RISK: 1 },
        retentionDays: 90,
    })
})

test("markRead : notification absente ou d'un autre utilisateur → NotFoundError", async () => {
    const service = new NotificationService()
    service.repo = { markRead: async () => false } as unknown as INotificationRepository

    await expect(service.markRead("n", "u1")).rejects.toThrow("Notification not found")
})

test("record : diffuse à la création seulement, pas sur un rejeu", async () => {
    const { repo } = fakeRepo()
    const stream = new NotificationStreamService()
    const pushed: string[] = []
    stream.subscribe("u1", (n) => pushed.push(n.type))
    const service = new NotificationService()
    service.repo = repo
    service.stream = stream

    await service.record(payload)
    await service.record(payload)

    expect(pushed).toEqual(["RISK_CONSTRAINT_VIOLATED"])
})
