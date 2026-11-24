import type { PaginationQuery } from "@azimut/contracts"
import { prisma } from "../prisma"
import { Prisma, type Notification, type NotificationPreference } from "../generated/prisma/client"
import type { CreateNotificationDTO, NotificationCounts, NotificationPreferencesColumns, NotificationListFilters } from "../interfaces/notification.interface"

export interface INotificationRepository {
    create(data: CreateNotificationDTO): Promise<Notification | null>
    list(userId: string, filters: NotificationListFilters, pagination: PaginationQuery): Promise<{ data: Notification[], count: number }>
    counts(userId: string): Promise<NotificationCounts>
    countUnread(userId: string): Promise<number>
    markRead(id: string, userId: string): Promise<boolean>
    markAllRead(userId: string): Promise<number>
    deleteOlderThan(date: Date): Promise<number>
    findPreferences(userId: string): Promise<NotificationPreference | null>
    upsertPreferences(userId: string, update: NotificationPreferencesColumns): Promise<NotificationPreference>
}

const UNIQUE_VIOLATION = "P2002"

class NotificationRepository implements INotificationRepository {
    /** Renvoie la ligne créée, ou `null` si la `dedupKey` existe déjà (rejeu Kafka). */
    async create(data: CreateNotificationDTO): Promise<Notification | null> {
        try {
            return await prisma.notification.create({ data })
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) return null
            throw error
        }
    }

    async list(userId: string, filters: NotificationListFilters, { page, pageSize }: PaginationQuery) {
        const where: Prisma.NotificationWhereInput = {
            userId,
            ...(filters.category && { category: filters.category }),
            ...(filters.unread && { readAt: null }),
        }
        const [data, count] = await prisma.$transaction([
            prisma.notification.findMany({
                where,
                // id départage deux createdAt identiques : pagination stable
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.notification.count({ where }),
        ])
        return { data, count }
    }

    /** Nombres des onglets : indépendants du filtre de la liste. */
    async counts(userId: string): Promise<NotificationCounts> {
        const [byCategory, unread] = await prisma.$transaction([
            prisma.notification.groupBy({ by: ["category"], where: { userId }, _count: { _all: true }, orderBy: { category: "asc" } }),
            prisma.notification.count({ where: { userId, readAt: null } }),
        ])
        const of = (category: "BACKTESTS" | "RISK") => byCategory.find((row) => row.category === category)?._count._all ?? 0
        const BACKTESTS = of("BACKTESTS")
        const RISK = of("RISK")
        return { all: BACKTESTS + RISK, unread, BACKTESTS, RISK }
    }

    countUnread(userId: string): Promise<number> {
        return prisma.notification.count({ where: { userId, readAt: null } })
    }

    /** `false` si la notification n'existe pas pour cet utilisateur ; marquer lue une notification déjà lue ne change rien. */
    async markRead(id: string, userId: string): Promise<boolean> {
        const [, owned] = await prisma.$transaction([
            prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } }),
            prisma.notification.count({ where: { id, userId } }),
        ])
        return owned > 0
    }

    async markAllRead(userId: string): Promise<number> {
        const { count } = await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
        return count
    }

    async deleteOlderThan(date: Date): Promise<number> {
        const { count } = await prisma.notification.deleteMany({ where: { createdAt: { lt: date } } })
        return count
    }

    /** `null` si l'utilisateur n'a jamais modifié ses préférences. */
    findPreferences(userId: string): Promise<NotificationPreference | null> {
        return prisma.notificationPreference.findUnique({ where: { userId } })
    }

    /** Crée la ligne (autres catégories activées par défaut) ou ne modifie que les colonnes fournies. */
    upsertPreferences(userId: string, update: NotificationPreferencesColumns): Promise<NotificationPreference> {
        return prisma.notificationPreference.upsert({ where: { userId }, create: { userId, ...update }, update })
    }
}

export default NotificationRepository
