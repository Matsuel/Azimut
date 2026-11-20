import { createKafkaEvent, type KafkaProducer } from "@azimut/kafka";
import { PRICING_TOPICS, type PricingCompletedPayload, type PricingFailedPayload } from "@azimut/contracts";

export interface IPricingPublisher {
    completed(payload: PricingCompletedPayload): Promise<void>;
    failed(payload: PricingFailedPayload): Promise<void>;
}

class PricingPublisher implements IPricingPublisher {
    constructor(private readonly producer: KafkaProducer) { }

    completed(payload: PricingCompletedPayload): Promise<void> {
        return this.publish(PRICING_TOPICS.completed, payload);
    }

    failed(payload: PricingFailedPayload): Promise<void> {
        return this.publish(PRICING_TOPICS.failed, payload);
    }

    // Clé = requestId : les événements d'une demande vont sur la même partition
    private publish<T extends { requestId: string }>(topic: string, payload: T): Promise<void> {
        return this.producer.publish(topic, {
            key: payload.requestId,
            value: createKafkaEvent(topic, payload),
        });
    }
}

export default PricingPublisher;
