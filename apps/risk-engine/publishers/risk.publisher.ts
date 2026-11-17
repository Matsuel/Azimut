import { createKafkaEvent, type KafkaProducer } from "@azimut/kafka";
import { PROJECTION_TOPICS, RISK_TOPICS, type ProjectionCompletedPayload, type RiskCompletedPayload } from "@azimut/contracts";

export interface IRiskPublisher {
    completed(payload: RiskCompletedPayload): Promise<void>;
    projectionCompleted(payload: ProjectionCompletedPayload): Promise<void>;
}

class RiskPublisher implements IRiskPublisher {
    constructor(private readonly producer: KafkaProducer) { }

    // Clé = executionId : même partition que les événements du backtest dont il est issu
    completed(payload: RiskCompletedPayload): Promise<void> {
        return this.producer.publish(RISK_TOPICS.completed, {
            key: payload.executionId,
            value: createKafkaEvent(RISK_TOPICS.completed, payload),
        });
    }

    projectionCompleted(payload: ProjectionCompletedPayload): Promise<void> {
        return this.producer.publish(PROJECTION_TOPICS.completed, {
            key: payload.executionId,
            value: createKafkaEvent(PROJECTION_TOPICS.completed, payload),
        });
    }
}

export default RiskPublisher;
