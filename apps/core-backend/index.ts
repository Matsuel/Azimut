import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorMiddleware, registerProbes } from "@azimut/http";
import { authRateLimit, backtestCreateRateLimit } from './middleware/rate-limit.middleware';
import { dbHealthCheck } from './utils/db';
import { CORE_BACKEND_CHECKS } from './utils/probes';
import authRouter from './routes/auth';
import portfolioRouter from './routes/portfolio';
import marketRouter from './routes/market';
import notificationRouter from './routes/notification';
import backtestRouter from './routes/backtest';
import riskRouter from './routes/risk';
import projectionRouter from './routes/projection';
import { Logger, onShutdown } from '@azimut/utils';
import { BACKTEST_TOPICS, PROJECTION_TOPICS, RISK_TOPICS } from '@azimut/contracts';
import { consumer, kafkaClient, producer } from './lib/kafka';
import type { MessageHandler } from '@azimut/kafka';
import BacktestConsumer from './consumers/backtest.consumer';
import RiskConsumer from './consumers/risk.consumer';
import ProjectionConsumer from './consumers/projection.consumer';
import BacktestService from './services/backtest.service';
import { STALE_SWEEP_INTERVAL_MS } from './constants/backtest.constants';
import { JSON_BODY_LIMIT } from './constants/http.constants';
import { env } from './env';

const logger = Logger.here()

const backtestService = new BacktestService();

const app = express();

app.set('trust proxy', env.TRUST_PROXY);

// Sondes Kubernetes, avant helmet et les limiteurs
registerProbes(app, CORE_BACKEND_CHECKS);

app.use(helmet());

app.use(cors({
    origin: env.WEB_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}))

app.use('/api/auth', authRateLimit);
app.use(authRouter);

// Routes proxifiées vers les microservices : avant express.json() pour garder le body intact.
app.use(marketRouter);
app.use(notificationRouter);

app.use(express.json({ limit: JSON_BODY_LIMIT }));

app.use(portfolioRouter);

app.use('/api/backtest', backtestCreateRateLimit);
app.use(backtestRouter);
app.use(riskRouter);
app.use(projectionRouter);

app.use(errorMiddleware);

async function main(): Promise<void> {
    await dbHealthCheck();

    // L'API écoute avant Kafka : l'entrée dans le groupe du consumer peut durer des dizaines de secondes après un redémarrage
    // (l'ancien membre doit expirer) et le web ne doit pas tomber en `fetch failed` pendant ce temps.
    const server = app.listen(env.PORT, () => logger.info(`Server is running on port ${env.PORT}`));
    onShutdown(() => new Promise<void>((resolve) => server.close(() => resolve())));

    await kafkaClient.ensureTopics([...Object.values(BACKTEST_TOPICS), ...Object.values(RISK_TOPICS), ...Object.values(PROJECTION_TOPICS)]);
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe(BACKTEST_TOPICS.started);
    await consumer.subscribe(BACKTEST_TOPICS.completed);
    await consumer.subscribe(BACKTEST_TOPICS.failed);
    await consumer.subscribe(RISK_TOPICS.completed);
    await consumer.subscribe(PROJECTION_TOPICS.completed);
    const backtestConsumer = new BacktestConsumer();
    const riskConsumer = new RiskConsumer();
    const projectionConsumer = new ProjectionConsumer();
    // Un seul consumer Kafka : le topic route le message vers le consommateur du domaine
    const consumers: Record<string, { handle: MessageHandler<unknown> }> = {
        [RISK_TOPICS.completed]: riskConsumer,
        [PROJECTION_TOPICS.completed]: projectionConsumer,
    };
    await consumer.consume((message, context) => (consumers[context.topic] ?? backtestConsumer).handle(message, context));
    onShutdown(() => consumer.disconnect());
    onShutdown(() => producer.disconnect());

    // Une exécution que l'engine n'a jamais terminée ne doit pas bloquer son backtest
    const sweeper = setInterval(() => {
        backtestService.failStaleExecutions().catch((error) => logger.error('Stale sweep failed', { error: String(error) }));
    }, STALE_SWEEP_INTERVAL_MS);
    onShutdown(() => clearInterval(sweeper));
}

// Sans Kafka le backtest ne fonctionne pas : on s'arrête franchement (le serveur et les connexions gardent sinon le process en vie)
main().catch((error) => {
    logger.error('Failed to start core-backend', error);
    process.exit(1);
});
