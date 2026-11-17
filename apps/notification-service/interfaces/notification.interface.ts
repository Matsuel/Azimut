import type { NotificationCategory, NotificationCounts, NotificationType } from "@azimut/contracts"
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

export type { NotificationCounts }
