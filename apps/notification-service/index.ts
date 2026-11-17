import express from "express";
import { errorMiddleware } from "@azimut/http";
import { KafkaClient, KafkaConsumer } from "@azimut/kafka";
import { NOTIFICATION_TOPICS } from "@azimut/contracts";
import { Logger, onShutdown } from "@azimut/utils";
import { env } from "./env";
import { NOTIFICATION_CONSUMER_GROUP } from "./constants/notification.constants";
import NotificationConsumer from "./consumers/notification.consumer";
import NotificationService from "./services/notification.service";
import internalAuthMiddleware from "./middleware/internal-auth.middleware";

const logger = Logger.here();

const client = new KafkaClient();

const consumer = new KafkaConsumer(client.createConsumer(NOTIFICATION_CONSUMER_GROUP));

const notificationConsumer = new NotificationConsumer(new NotificationService());

const app = express();

app.use(express.json());

// Sonde de disponibilité, sans clé : ne révèle rien
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.use(internalAuthMiddleware);

app.use(errorMiddleware);

async function main(): Promise<void> {
    await client.ensureTopics([NOTIFICATION_TOPICS.requested]);

    await consumer.connect();
    await consumer.subscribe(NOTIFICATION_TOPICS.requested);
    await consumer.consume(notificationConsumer.handle);
    onShutdown(() => consumer.disconnect());

    // Le serveur n'écoute qu'une fois Kafka prêt : un démarrage raté ne laisse pas un process à moitié vivant
    const server = app.listen(env.PORT, () => {
        logger.info(`Server is running on port ${env.PORT}`);
    });
    onShutdown(() => new Promise<void>((resolve) => server.close(() => resolve())));
}

main().catch((error) => {
    logger.error("Failed to start notification service", error);
    process.exitCode = 1;
});
