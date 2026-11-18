import { Logger } from "@azimut/utils";
import type { MessageHandler } from "@azimut/kafka";
import { notificationRequestedEventSchema } from "@azimut/contracts";
import type NotificationService from "../services/notification.service";

const logger = Logger.here();

class NotificationConsumer {
    constructor(private readonly notificationService: NotificationService) { }

    handle: MessageHandler<unknown> = async (message, { topic }) => {
        const parsed = notificationRequestedEventSchema.safeParse(message);
        if (!parsed.success) {
            logger.warn("Invalid Kafka message", { topic, issues: parsed.error.issues });
            return;
        }
        await this.notificationService.record(parsed.data.payload);
    };
}

export default NotificationConsumer;
