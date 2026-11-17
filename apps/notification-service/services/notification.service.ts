import { NOTIFICATION_CATEGORY_BY_TYPE, type NotificationRequestedPayload, type NotificationView } from "@azimut/contracts"
import { Logger } from "@azimut/utils"
import NotificationRepository, { type INotificationRepository } from "../repositories/notification.repository"
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
}

export default NotificationService
