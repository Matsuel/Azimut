import { beforeEach, expect, test } from "bun:test"
import NotificationRepository from "../repositories/notification.repository"
import type { CreateNotificationDTO } from "../interfaces/notification.interface"
import { describeWithDb, resetDatabase } from "./database"

const repo = new NotificationRepository()
const page = { page: 1, pageSize: 20 }

const make = (over: Partial<CreateNotificationDTO> = {}): CreateNotificationDTO => ({
    userId: "u1",
    type: "BACKTEST_COMPLETED",
    category: "BACKTESTS",
    params: { backtestId: "b", name: "N" },
    dedupKey: crypto.randomUUID(),
    createdAt: new Date(),
    ...over,
})

describeWithDb("NotificationRepository (base de test)", () => {
    beforeEach(resetDatabase)

    test("create : une dedupKey déjà présente renvoie null sans doublon", async () => {
        const first = await repo.create(make({ dedupKey: "k" }))
        const second = await repo.create(make({ dedupKey: "k" }))

        expect(first?.dedupKey).toBe("k")
        expect(second).toBeNull()
        expect((await repo.list("u1", {}, page)).count).toBe(1)
    })

    test("list : isolée par utilisateur, du plus récent au plus ancien", async () => {
        await repo.create(make({ dedupKey: "old", createdAt: new Date("2026-01-01") }))
        await repo.create(make({ dedupKey: "new", createdAt: new Date("2026-02-01") }))
        await repo.create(make({ dedupKey: "other", userId: "u2" }))

        const { data, count } = await repo.list("u1", {}, page)

        expect(count).toBe(2)
        expect(data.map((n) => n.dedupKey)).toEqual(["new", "old"])
    })

    test("list : filtres category et unread, pagination", async () => {
        const a = await repo.create(make({ dedupKey: "a", createdAt: new Date("2026-01-01") }))
        await repo.create(make({ dedupKey: "b", category: "RISK", type: "RISK_CONSTRAINT_VIOLATED", createdAt: new Date("2026-01-02") }))
        await repo.create(make({ dedupKey: "c", createdAt: new Date("2026-01-03") }))
        await repo.markRead(a!.id, "u1")

        expect((await repo.list("u1", { category: "RISK" }, page)).data.map((n) => n.dedupKey)).toEqual(["b"])
        expect((await repo.list("u1", { unread: true }, page)).count).toBe(2)
        const second = await repo.list("u1", {}, { page: 2, pageSize: 2 })
        expect(second.count).toBe(3)
        expect(second.data.map((n) => n.dedupKey)).toEqual(["a"])
    })

    test("counts : indépendants du filtre, unread et catégories", async () => {
        const a = await repo.create(make({ dedupKey: "a" }))
        await repo.create(make({ dedupKey: "b", category: "RISK", type: "RISK_CONSTRAINT_VIOLATED" }))
        await repo.create(make({ dedupKey: "c", userId: "u2" }))
        await repo.markRead(a!.id, "u1")

        expect(await repo.counts("u1")).toEqual({ all: 2, unread: 1, BACKTESTS: 1, RISK: 1 })
        expect(await repo.countUnread("u1")).toBe(1)
    })

    test("markRead : idempotent, refusé pour un autre utilisateur ; markAllRead", async () => {
        const n = await repo.create(make({ dedupKey: "a" }))
        await repo.create(make({ dedupKey: "b" }))

        expect(await repo.markRead(n!.id, "u2")).toBe(false)
        expect(await repo.markRead(n!.id, "u1")).toBe(true)
        expect(await repo.markRead(n!.id, "u1")).toBe(true)
        expect(await repo.markAllRead("u1")).toBe(1)
        expect(await repo.markAllRead("u1")).toBe(0)
        expect(await repo.countUnread("u1")).toBe(0)
    })

    test("deleteOlderThan : seules les notifications plus anciennes disparaissent", async () => {
        await repo.create(make({ dedupKey: "old", createdAt: new Date("2026-01-01") }))
        await repo.create(make({ dedupKey: "new", createdAt: new Date("2026-06-01") }))

        expect(await repo.deleteOlderThan(new Date("2026-03-01"))).toBe(1)
        expect((await repo.list("u1", {}, page)).data.map((n) => n.dedupKey)).toEqual(["new"])
    })
})

describeWithDb("NotificationRepository : préférences (base de test)", () => {
    beforeEach(resetDatabase)

    test("findPreferences : null sans ligne", async () => {
        expect(await repo.findPreferences("u1")).toBeNull()
    })

    test("upsertPreferences : crée avec le reste activé, puis ne modifie que la colonne fournie", async () => {
        const created = await repo.upsertPreferences("u1", { risk: false })
        expect(created).toMatchObject({ userId: "u1", backtests: true, risk: false })

        const updated = await repo.upsertPreferences("u1", { backtests: false })
        expect(updated).toMatchObject({ backtests: false, risk: false })
        expect(await repo.findPreferences("u2")).toBeNull()
    })
})

describeWithDb("NotificationRepository : deleteUserData (base de test)", () => {
    beforeEach(resetDatabase)

    test("supprime notifications et préférences de l'utilisateur ciblé seulement, rejeu sans erreur", async () => {
        await repo.create(make({ dedupKey: "a" }))
        await repo.create(make({ dedupKey: "b", category: "RISK", type: "RISK_CONSTRAINT_VIOLATED" }))
        await repo.create(make({ dedupKey: "c", userId: "u2" }))
        await repo.upsertPreferences("u1", { risk: false })
        await repo.upsertPreferences("u2", { risk: false })

        await repo.deleteUserData("u1")
        await repo.deleteUserData("u1")

        expect((await repo.list("u1", {}, page)).count).toBe(0)
        expect(await repo.findPreferences("u1")).toBeNull()
        expect((await repo.list("u2", {}, page)).count).toBe(1)
        expect(await repo.findPreferences("u2")).not.toBeNull()
    })
})
