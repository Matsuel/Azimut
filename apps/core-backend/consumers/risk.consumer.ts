import { Logger } from "@azimut/utils"
import type { MessageHandler } from "@azimut/kafka"
import { riskCompletedEventSchema } from "@azimut/contracts"
import RiskService from "../services/risk.service"

const logger = Logger.here()

class RiskConsumer {

    private riskService = new RiskService()

    handle: MessageHandler<unknown> = async (message, { topic }) => {
        const parsed = riskCompletedEventSchema.safeParse(message)
        // Un message invalide est loggué et ignoré pour ne pas bloquer la partition
        if (!parsed.success) {
            logger.warn("Invalid Kafka message", { topic, issues: parsed.error.issues })
            return
        }
        await this.riskService.store(parsed.data.payload)
    }
}

export default RiskConsumer
