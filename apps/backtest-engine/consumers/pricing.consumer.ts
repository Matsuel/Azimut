import { Logger } from "@azimut/utils";
import type { MessageHandler } from "@azimut/kafka";
import { pricingRequestedEventSchema } from "@azimut/contracts";
import type PricingService from "../services/pricing.service";

const logger = Logger.here();

class PricingConsumer {
    constructor(private readonly pricingService: PricingService) { }

    handle: MessageHandler<unknown> = async (message, { topic }) => {
        const parsed = pricingRequestedEventSchema.safeParse(message);
        if (!parsed.success) {
            logger.warn("Invalid Kafka message", { topic, issues: parsed.error.issues });
            return;
        }
        await this.pricingService.run(parsed.data.payload);
    };
}

export default PricingConsumer;
