import { API_ERROR_CODES, DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_CATEGORY_BY_TYPE, type NotificationList, type NotificationPreferences, type NotificationPreferencesUpdate, type NotificationRequestedPayload, type NotificationView, type PaginationQuery } from "@azimut/contracts"
import { NotFoundError } from "@azimut/http"
import { DAY_MS, Logger } from "@azimut/utils"
import NotificationRepository, { type INotificationRepository } from "../repositories/notification.repository"
import type { NotificationListFilters } from "../interfaces/notification.interface"
import { NOTIFICATION_PURGE_INTERVAL_MS, NOTIFICATION_RETENTION_DAYS } from "../constants/notification.constants"
import NotificationStreamService, { notificationStream } from "./notification-stream.service"
import { toNotificationView, toPreferenceColumns, toPreferences } from "../utils/notification.mapper"

const logger = Logger.here()

class NotificationService {
    repo: INotificationRepository = new NotificationRepository()
    stream: NotificationStreamService = notificationStream

    /**
     * Enregistre la notification demandée. Idempotent : une `dedupKey` déjà connue (rejeu Kafka) n'insère rien et renvoie `null`.
     * La diffuse en SSE à son propriétaire. Une base indisponible lève : kafkajs rejoue le message.
     */
    async record(payload: NotificationRequestedPayload): Promise<NotificationView | null> {
        const row = await this.repo.create({
            userId: payload.userId,
            type: payload.type,
            category: NOTIFICATION_CATEGORY_BY_TYPE[payload.type],
            params: payload.params,
            dedupKey: payload.dedupKey,
            createdAt: new Date(payload.occurredAt),
        })
        if (!row) {
            logger.info("Notification already recorded, skipped", { dedupKey: payload.dedupKey })
            return null
        }
        const view = toNotificationView(row)
        // Diffusée seulement à la création : un rejeu ne repousse rien
        this.stream.publish(payload.userId, view)
        return view
    }

    /** Préférences de l'utilisateur ; sans ligne, tout est activé (rien n'est écrit). */
    async getPreferences(userId: string): Promise<NotificationPreferences> {
        const row = await this.repo.findPreferences(userId)
        return row ? toPreferences(row) : { ...DEFAULT_NOTIFICATION_PREFERENCES }
    }

    /** Mise à jour partielle : les catégories absentes de `update` gardent leur valeur. Renvoie les préférences résultantes. */
    async updatePreferences(userId: string, update: NotificationPreferencesUpdate): Promise<NotificationPreferences> {
        return toPreferences(await this.repo.upsertPreferences(userId, toPreferenceColumns(update)))
    }

    /** Liste paginée de l'utilisateur, avec les nombres des onglets (indépendants du filtre) et la durée de conservation. */
    async list(userId: string, filters: NotificationListFilters, pagination: PaginationQuery): Promise<NotificationList> {
        const [{ data, count }, counts] = await Promise.all([this.repo.list(userId, filters, pagination), this.repo.counts(userId)])
        return { data: data.map(toNotificationView), count, ...pagination, counts, retentionDays: NOTIFICATION_RETENTION_DAYS }
    }

    countUnread(userId: string): Promise<number> {
        return this.repo.countUnread(userId)
    }

    /** Idempotent. Lève `NotFoundError` si la notification n'existe pas ou appartient à un autre utilisateur. */
    async markRead(id: string, userId: string): Promise<void> {
        if (!(await this.repo.markRead(id, userId))) throw new NotFoundError(API_ERROR_CODES.NOTIFICATION_NOT_FOUND)
    }

    async markAllRead(userId: string): Promise<void> {
        await this.repo.markAllRead(userId)
    }

    /** Supprime les notifications créées il y a plus de `NOTIFICATION_RETENTION_DAYS` jours ; renvoie leur nombre. */
    purgeExpired(now = new Date()): Promise<number> {
        return this.repo.deleteOlderThan(new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * DAY_MS))
    }

    /** Lance la purge tout de suite puis une fois par heure ; renvoie l'arrêt. Une erreur est loggée sans arrêter le service. */
    startPurge(): () => void {
        const run = () =>
            this.purgeExpired()
                .then((count) => count > 0 && logger.info(`Purged ${count} expired notifications`))
                .catch((error) => logger.error("Notification purge failed", error))
        void run()
        const timer = setInterval(run, NOTIFICATION_PURGE_INTERVAL_MS)
        return () => clearInterval(timer)
    }
}

export default NotificationService
