import {
    KafkaClient,
    KafkaConsumer,
    KafkaProducer,
} from "@azimut/kafka";
import { BACKTEST_TOPICS } from "@azimut/contracts";
import { kafkaCheck, startProbeServer } from "@azimut/http";
import { Logger, onShutdown } from "@azimut/utils";
import BacktestConsumer from "./consumers/backtest.consumer";
import BacktestPublisher from "./publishers/backtest.publisher";
import BacktestService from "./services/backtest.service";
import { env } from "./env";

const logger = Logger.here();

const client = new KafkaClient();

const producer = new KafkaProducer(client.createProducer());

const consumer = new KafkaConsumer(
    client.createConsumer("backtest-engine-events"),
);

const backtestConsumer = new BacktestConsumer(
    new BacktestService(new BacktestPublisher(producer)),
);

async function main(): Promise<void> {
    // Les sondes écoutent avant Kafka : la liveness répond pendant l'entrée dans le groupe, qui peut durer des dizaines de secondes
    const probes = await startProbeServer(env.HEALTH_PORT, [kafkaCheck([consumer, producer])]);
    logger.info(`Probes are listening on port ${probes.port}`);

    await client.ensureTopics(Object.values(BACKTEST_TOPICS));

    await producer.connect();
    await consumer.connect();

    await consumer.subscribe(BACKTEST_TOPICS.requested);

    await consumer.consume(backtestConsumer.handle);

    onShutdown(() => consumer.disconnect());
    onShutdown(() => producer.disconnect());
    // Fermées en dernier : les arrêts s'enchaînent dans l'ordre d'enregistrement, le consumer n'attend pas les sondes
    onShutdown(() => probes.close());

    logger.info("Backtest engine is listening to Kafka");
}

// Le serveur de sondes garde sinon le process en vie à moitié démarré, sans Kafka
main().catch((error) => {
    logger.error("Failed to start backtest engine", error);
    process.exit(1);
});
