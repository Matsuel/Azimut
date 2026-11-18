import { createKafkaEvent } from "@azimut/kafka"
import { NOTIFICATION_TOPICS, type NotificationRequestedPayload } from "@azimut/contracts"
import { Logger } from "@azimut/utils"
import { producer } from "../lib/kafka"

const logger = Logger.here()

/**
 * Publie `notification.requested` après une transition déjà commitée. Un échec est loggué sans lever : la notification
 * est perdue mais la transition reste valide (D7, pas d'outbox).
 */
export async function publishNotification(payload: NotificationRequestedPayload): Promise<void> {
    try {
        await producer.publish(NOTIFICATION_TOPICS.requested, {
            key: payload.userId,
            value: createKafkaEvent(NOTIFICATION_TOPICS.requested, payload),
        })
    } catch (error) {
        logger.error("Failed to publish notification", { type: payload.type, dedupKey: payload.dedupKey, error })
    }
}
