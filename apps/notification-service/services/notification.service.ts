import { API_ERROR_CODES, NOTIFICATION_CATEGORY_BY_TYPE, type NotificationList, type NotificationRequestedPayload, type NotificationView, type PaginationQuery } from "@azimut/contracts"
import { NotFoundError } from "@azimut/http"
import { Logger } from "@azimut/utils"
import NotificationRepository, { type INotificationRepository } from "../repositories/notification.repository"
import type { NotificationListFilters } from "../interfaces/notification.interface"
import { NOTIFICATION_RETENTION_DAYS } from "../constants/notification.constants"
import { toNotificationView } from "../utils/notification.mapper"

const logger = Logger.here()

class NotificationService {
    repo: INotificationRepository = new NotificationRepository()

    /**
     * Enregistre la notification demandée. Idempotent : une `dedupKey` déjà connue (rejeu Kafka) n'insère rien et renvoie `null`.
     * Une base indisponible lève : kafkajs rejoue le message.
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
        return toNotificationView(row)
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
}

export default NotificationService
