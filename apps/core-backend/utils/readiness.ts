import type { ProbeCheck } from "@azimut/http";

/** Client Kafka dont l'état de connexion est connu (`KafkaConsumer`, `KafkaProducer`). */
interface ReadyClient {
    isReady(): boolean;
}

/**
 * Contrôles de `/readiness` de core-backend (D3) : `database` = la base `trading` répond ;
 * `kafka` = tous les clients Kafka (consumers et producer) sont prêts (D4). Sans client Kafka, `kafka` est `ok`.
 */
export function readinessChecks(isDbConnected: () => Promise<boolean>, kafkaClients: ReadyClient[]): ProbeCheck[] {
    return [
        { name: "database", check: isDbConnected },
        { name: "kafka", check: () => kafkaClients.every((client) => client.isReady()) },
    ];
}
