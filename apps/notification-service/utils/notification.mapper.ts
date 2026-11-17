import type { NotificationView } from "@azimut/contracts"
import type { Notification } from "../generated/prisma/client"

/** Ligne de base → notification de l'API. `params` a été validé par le contrat à l'enregistrement : le cast ne fait que rétablir le type. */
export const toNotificationView = (row: Notification): NotificationView =>
    ({
        id: row.id,
        type: row.type,
        category: row.category,
        params: row.params,
        createdAt: row.createdAt.toISOString(),
        readAt: row.readAt?.toISOString() ?? null,
    }) as NotificationView
