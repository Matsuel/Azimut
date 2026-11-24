import type { NotificationPreferences, NotificationPreferencesUpdate, NotificationView } from "@azimut/contracts"
import type { Notification, NotificationPreference } from "../generated/prisma/client"
import type { NotificationPreferencesColumns } from "../interfaces/notification.interface"

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

/** Ligne de préférences → préférences de l'API (une clé par catégorie). */
export const toPreferences = (row: NotificationPreference): NotificationPreferences => ({ BACKTESTS: row.backtests, RISK: row.risk })

/** Mise à jour de l'API → colonnes à écrire ; une catégorie absente n'est pas touchée. */
export const toPreferenceColumns = (update: NotificationPreferencesUpdate): NotificationPreferencesColumns => ({
    ...(update.BACKTESTS !== undefined && { backtests: update.BACKTESTS }),
    ...(update.RISK !== undefined && { risk: update.RISK }),
})
