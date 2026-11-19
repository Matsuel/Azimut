import type { ProbeCheck } from "@azimut/http";

/** Un client Kafka dont la sonde lit l'état (`KafkaConsumer`, `KafkaProducer`). */
interface ReadyClient {
    isReady(): boolean;
}

/**
 * Contrôles de `/readiness` du worker (D3) : un seul contrôle `kafka`, `ok` seulement si le consumer
 * a rejoint son groupe **et** si le producer est connecté. L'état est relu à chaque requête de sonde.
 */
export function kafkaProbeChecks(consumer: ReadyClient, producer: ReadyClient): ProbeCheck[] {
    return [{ name: "kafka", check: () => consumer.isReady() && producer.isReady() }];
}
