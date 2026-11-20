import type { z } from "zod"
import { Logger } from "@azimut/utils"
import type { MessageHandler } from "@azimut/kafka"
import { PRICING_TOPICS, pricingCompletedEventSchema, pricingFailedEventSchema } from "@azimut/contracts"
import PricingService from "../services/pricing.service"

const logger = Logger.here()

class PricingConsumer {

    private pricingService = new PricingService()

    handle: MessageHandler<unknown> = async (message, { topic }) => {
        switch (topic) {
            case PRICING_TOPICS.completed: {
                const event = this.parse(pricingCompletedEventSchema, message, topic)
                if (event) await this.pricingService.complete(event.payload)
                break
            }
            case PRICING_TOPICS.failed: {
                const event = this.parse(pricingFailedEventSchema, message, topic)
                if (event) await this.pricingService.fail(event.payload)
                break
            }
        }
    }

    // Un message invalide est loggué et ignoré pour ne pas bloquer la partition
    private parse<T extends z.ZodType>(schema: T, message: unknown, topic: string): z.infer<T> | null {
        const parsed = schema.safeParse(message)
        if (!parsed.success) {
            logger.warn("Invalid Kafka message", { topic, issues: parsed.error.issues })
            return null
        }
        return parsed.data
    }
}

export default PricingConsumer
