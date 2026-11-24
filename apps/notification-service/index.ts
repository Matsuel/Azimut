import express from "express";
import { errorMiddleware, kafkaCheck, registerProbes } from "@azimut/http";
import { KafkaClient, KafkaConsumer } from "@azimut/kafka";
import { ACCOUNT_TOPICS, NOTIFICATION_TOPICS } from "@azimut/contracts";
import { Logger, onShutdown } from "@azimut/utils";
import { env } from "./env";
import { ACCOUNT_CONSUMER_GROUP, NOTIFICATION_CONSUMER_GROUP } from "./constants/notification.constants";
import NotificationConsumer from "./consumers/notification.consumer";
import UserDataResetConsumer from "./consumers/user-data-reset.consumer";
import NotificationService from "./services/notification.service";
import internalAuthMiddleware from "./middleware/internal-auth.middleware";
import notificationRouter from "./routes/notification";
import { isDbConnected } from "./utils/db";

const logger = Logger.here();

const client = new KafkaClient();

const consumer = new KafkaConsumer(client.createConsumer(NOTIFICATION_CONSUMER_GROUP));

const accountConsumer = new KafkaConsumer(client.createConsumer(ACCOUNT_CONSUMER_GROUP));

const notificationService = new NotificationService();

const notificationConsumer = new NotificationConsumer(notificationService);

const userDataResetConsumer = new UserDataResetConsumer(notificationService);

const app = express();

app.use(express.json());

// Sondes sans clé interne (lues par core-backend et Kubernetes) : prêt quand la base `notifications` répond et que le consumer a rejoint son groupe (D3, D4)
registerProbes(app, [
    { name: "database", check: isDbConnected },
    kafkaCheck([consumer, accountConsumer]),
]);

app.use(internalAuthMiddleware);

app.use(notificationRouter);

app.use(errorMiddleware);

async function main(): Promise<void> {
    // Le service écoute avant Kafka : l'entrée dans le groupe du consumer peut durer des dizaines de secondes après un redémarrage
    // (l'ancien membre doit expirer) et le relais de core-backend ne doit pas tomber en `ECONNREFUSED` pendant ce temps.
    const server = app.listen(env.PORT, () => logger.info(`Server is running on port ${env.PORT}`));
    onShutdown(() => new Promise<void>((resolve) => server.close(() => resolve())));

    await client.ensureTopics([NOTIFICATION_TOPICS.requested, ACCOUNT_TOPICS.dataReset]);

    await consumer.connect();
    await consumer.subscribe(NOTIFICATION_TOPICS.requested);
    await consumer.consume(notificationConsumer.handle);
    onShutdown(() => consumer.disconnect());

    await accountConsumer.connect();
    await accountConsumer.subscribe(ACCOUNT_TOPICS.dataReset);
    await accountConsumer.consume(userDataResetConsumer.handle);
    onShutdown(() => accountConsumer.disconnect());

    onShutdown(notificationService.startPurge());
}

// Sans Kafka le service ne reçoit rien : on s'arrête franchement (le serveur garde sinon le process en vie à moitié démarré)
main().catch((error) => {
    logger.error("Failed to start notification service", error);
    process.exit(1);
});
