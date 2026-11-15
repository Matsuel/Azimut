import { Logger } from "@azimut/utils";
import type { MessageHandler } from "@azimut/kafka";
import { backtestCompletedEventSchema } from "@azimut/contracts";
import type RiskService from "../services/risk.service";

const logger = Logger.here();

class RiskConsumer {
    constructor(private readonly riskService: RiskService) { }

    handle: MessageHandler<unknown> = async (message, { topic }) => {
        const parsed = backtestCompletedEventSchema.safeParse(message);
        if (!parsed.success) {
            logger.warn("Invalid Kafka message", { topic, issues: parsed.error.issues });
            return;
        }
        await this.riskService.compute(parsed.data.payload);
    };
}

export default RiskConsumer;
