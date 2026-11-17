import { Logger } from "@azimut/utils";
import type { MessageHandler } from "@azimut/kafka";
import { notificationRequestedEventSchema } from "@azimut/contracts";

const logger = Logger.here();

class NotificationConsumer {
    handle: MessageHandler<unknown> = async (message, { topic }) => {
        const parsed = notificationRequestedEventSchema.safeParse(message);
        if (!parsed.success) {
            logger.warn("Invalid Kafka message", { topic, issues: parsed.error.issues });
            return;
        }
        logger.info("Notification requested", { dedupKey: parsed.data.payload.dedupKey });
    };
}

export default NotificationConsumer;
