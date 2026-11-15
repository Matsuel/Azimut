import { KafkaClient, KafkaConsumer, KafkaProducer } from "@azimut/kafka";
import { BACKTEST_TOPICS, RISK_TOPICS } from "@azimut/contracts";
import { Logger, onShutdown } from "@azimut/utils";
import RiskConsumer from "./consumers/risk.consumer";
import RiskPublisher from "./publishers/risk.publisher";
import RiskService from "./services/risk.service";

const logger = Logger.here();

const client = new KafkaClient();

const producer = new KafkaProducer(client.createProducer());

const consumer = new KafkaConsumer(client.createConsumer("risk-engine-events"));

const riskConsumer = new RiskConsumer(new RiskService(new RiskPublisher(producer)));

async function main(): Promise<void> {
    await client.ensureTopics([BACKTEST_TOPICS.completed, RISK_TOPICS.completed]);

    await producer.connect();
    await consumer.connect();

    await consumer.subscribe(BACKTEST_TOPICS.completed);

    await consumer.consume(riskConsumer.handle);

    onShutdown(() => consumer.disconnect());
    onShutdown(() => producer.disconnect());

    logger.info("Risk engine is listening to Kafka");
}

main().catch((error) => {
    logger.error("Failed to start risk engine", error);
    process.exitCode = 1;
});
