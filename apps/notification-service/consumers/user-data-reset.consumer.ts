import { Logger } from "@azimut/utils";
import type { MessageHandler } from "@azimut/kafka";
import { userDataResetEventSchema } from "@azimut/contracts";
import type NotificationService from "../services/notification.service";

const logger = Logger.here();

class UserDataResetConsumer {
    constructor(private readonly notificationService: NotificationService) { }

    handle: MessageHandler<unknown> = async (message, { topic }) => {
        const parsed = userDataResetEventSchema.safeParse(message);
        if (!parsed.success) {
            logger.warn("Invalid Kafka message", { topic, issues: parsed.error.issues });
            return;
        }
        await this.notificationService.resetUserData(parsed.data.payload.userId);
    };
}

export default UserDataResetConsumer;
