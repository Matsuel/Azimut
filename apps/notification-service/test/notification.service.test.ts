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
function fakeRepo(preferences: { backtests: boolean, risk: boolean } | null = null) {
    const rows = new Map<string, Notification>()
    const repo = {
        findPreferences: async (userId: string) => (preferences && { userId, ...preferences }),
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

test("record : catégorie désactivée → ni insertion ni diffusion, renvoie null", async () => {
    const { repo, rows } = fakeRepo({ backtests: true, risk: false })
    const stream = new NotificationStreamService()
    const pushed: string[] = []
    stream.subscribe("u1", (n) => pushed.push(n.type))
    const service = new NotificationService()
    service.repo = repo
    service.stream = stream

    expect(await service.record(payload)).toBeNull()
    expect(rows.size).toBe(0)
    expect(pushed).toEqual([])
})

test("record : une autre catégorie désactivée n'empêche pas l'enregistrement", async () => {
    const { repo, rows } = fakeRepo({ backtests: false, risk: true })
    const service = new NotificationService()
    service.repo = repo

    expect(await service.record(payload)).not.toBeNull()
    expect(rows.size).toBe(1)
})

test("record : préférence absente = activée (déjà couvert par fakeRepo sans ligne), rejeu toujours ignoré", async () => {
    const { repo, rows } = fakeRepo(null)
    const service = new NotificationService()
    service.repo = repo

    expect(await service.record(payload)).not.toBeNull()
    expect(await service.record(payload)).toBeNull()
    expect(rows.size).toBe(1)
})

test("record : une base indisponible lève (kafkajs rejoue)", async () => {
    const service = new NotificationService()
    service.repo = { findPreferences: async () => null, create: async () => { throw new Error("db down") } } as unknown as INotificationRepository

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

test("purgeExpired : supprime ce qui a plus de 90 jours (rétention)", async () => {
    let cutoff: Date | undefined
    const service = new NotificationService()
    service.repo = { deleteOlderThan: async (date: Date) => ((cutoff = date), 2) } as unknown as INotificationRepository

    expect(await service.purgeExpired(new Date("2026-11-17T00:00:00.000Z"))).toBe(2)
    expect(cutoff).toEqual(new Date("2026-08-19T00:00:00.000Z"))
})

test("markRead : une notification de l'utilisateur est marquée lue sans erreur (idempotent)", async () => {
    const service = new NotificationService()
    service.repo = { markRead: async () => true } as unknown as INotificationRepository

    await service.markRead("n", "u1")
    await service.markRead("n", "u1")
})

test("countUnread et markAllRead délèguent au repository pour l'utilisateur", async () => {
    const calls: string[] = []
    const service = new NotificationService()
    service.repo = {
        countUnread: async (userId: string) => (calls.push(`count:${userId}`), 3),
        markAllRead: async (userId: string) => void calls.push(`all:${userId}`),
    } as unknown as INotificationRepository

    expect(await service.countUnread("u1")).toBe(3)
    await service.markAllRead("u1")
    expect(calls).toEqual(["count:u1", "all:u1"])
})

test("startPurge : purge tout de suite, une erreur de base ne lève pas, l'arrêt coupe le minuteur", async () => {
    let runs = 0
    const service = new NotificationService()
    service.repo = {
        deleteOlderThan: async () => {
            runs++
            throw new Error("db down")
        },
    } as unknown as INotificationRepository

    const stop = service.startPurge()
    await Bun.sleep(0)
    stop()

    expect(runs).toBe(1)
})

test("getPreferences : sans ligne, tout activé et rien n'est écrit", async () => {
    let writes = 0
    const service = new NotificationService()
    service.repo = {
        findPreferences: async () => null,
        upsertPreferences: async () => void writes++,
    } as unknown as INotificationRepository

    expect(await service.getPreferences("u1")).toEqual({ BACKTESTS: true, RISK: true })
    expect(writes).toBe(0)
})

test("getPreferences : mappe la ligne par catégorie", async () => {
    const service = new NotificationService()
    service.repo = { findPreferences: async () => ({ userId: "u1", backtests: false, risk: true }) } as unknown as INotificationRepository

    expect(await service.getPreferences("u1")).toEqual({ BACKTESTS: false, RISK: true })
})

test("updatePreferences : transmet seulement les colonnes fournies et renvoie le résultat", async () => {
    const calls: unknown[] = []
    const service = new NotificationService()
    service.repo = {
        upsertPreferences: async (userId: string, update: unknown) => (calls.push([userId, update]), { userId, backtests: true, risk: false }),
    } as unknown as INotificationRepository

    expect(await service.updatePreferences("u1", { RISK: false })).toEqual({ BACKTESTS: true, RISK: false })
    expect(calls).toEqual([["u1", { risk: false }]])
})
