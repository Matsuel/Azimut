import { z } from "zod"
import { notificationListQuerySchema, paginationQuerySchema, type NotificationCategory, type NotificationCounts, type NotificationType } from "@azimut/contracts"
import type { Prisma } from "../generated/prisma/client"

// Filtres de la liste (query validée : `notificationListQuerySchema` de `@azimut/contracts`)
export interface NotificationListFilters {
    category?: NotificationCategory
    unread?: boolean
}

// Notification à enregistrer : la catégorie est déduite du type par le service
export interface CreateNotificationDTO {
    userId: string
    type: NotificationType
    category: NotificationCategory
    params: Prisma.InputJsonValue
    dedupKey: string
    createdAt: Date
}

// ?category=RISK&unread=true&page=1&pageSize=20
export const listNotificationsQuerySchema = notificationListQuerySchema.extend(paginationQuerySchema.shape)

export const notificationIdSchema = z.string().trim().min(1)

export type { NotificationCounts }

// Colonnes de `NotificationPreference` (une par catégorie) ; toutes facultatives pour une mise à jour partielle
export interface NotificationPreferencesColumns {
    backtests?: boolean
    risk?: boolean
}
