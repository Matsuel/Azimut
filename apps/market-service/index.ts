import express from 'express';
import { errorMiddleware, registerProbes } from "@azimut/http";
import internalAuthMiddleware from './middleware/internal-auth.middleware';
import marketRouter from './routes/market';
import { Logger, onShutdown } from '@azimut/utils';
import { env } from './env';
import MarketService from './services/market.service';

const logger = Logger.here()

const app = express();

app.use(express.json());

// Sondes sans clé interne (lues par core-backend et Kubernetes) : la readiness dépend du seul fournisseur Yahoo (D3)
const marketService = new MarketService();
registerProbes(app, [{ name: 'provider', check: () => marketService.isProviderReachable() }]);

app.use(internalAuthMiddleware);

app.use(marketRouter);

app.use(errorMiddleware);

const server = app.listen(env.PORT, () => {
    logger.info(`Server is running on port ${env.PORT}`);
});

onShutdown(() => new Promise<void>((resolve) => server.close(() => resolve())));
