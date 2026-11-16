import { Logger } from "@azimut/utils"
import type { MessageHandler } from "@azimut/kafka"
import { projectionCompletedEventSchema } from "@azimut/contracts"
import ProjectionService from "../services/projection.service"

const logger = Logger.here()

class ProjectionConsumer {

    private projectionService = new ProjectionService()

    handle: MessageHandler<unknown> = async (message, { topic }) => {
        const parsed = projectionCompletedEventSchema.safeParse(message)
        // Un message invalide est loggué et ignoré pour ne pas bloquer la partition
        if (!parsed.success) {
            logger.warn("Invalid Kafka message", { topic, issues: parsed.error.issues })
            return
        }
        await this.projectionService.store(parsed.data.payload)
    }
}

export default ProjectionConsumer
