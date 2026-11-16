import { Logger, REFERENCE_CURRENCY, fxPairSymbol } from "@azimut/utils";
import type { BacktestCompletedPayload } from "@azimut/contracts";
import { PROJECTION_PARAMS } from "@azimut/contracts";
import computeProjection from "../engine/projection.engine";
import computeRisk from "../engine/risk.engine";
import { toEuros } from "../engine/risk.utils";
import type { IRiskPublisher } from "../publishers/risk.publisher";
import { MarketClient, type IMarketClient } from "@azimut/market-client";
import { env } from "../env";

const logger = Logger.here();

class RiskService {
    repo: IMarketClient = new MarketClient({ baseUrl: env.MARKET_SERVICE_URL, apiKey: env.INTERNAL_API_KEY });

    constructor(private readonly publisher: IRiskPublisher) { }

    /**
     * Calcule le risque d'un `backtest.completed` et publie `risk.completed`, puis `projection.completed` (`risk` null sous 250 jours
     * communs, `projection` null sous 2 jours communs ou si un actif n'a aucun cours, D12). Les cours en euros sont lus une fois pour les deux calculs ; `totalInvested` est le capital de départ.
     * Une erreur (market-service injoignable, taux de change manquant, échec de la projection) n'est pas capturée : le consommateur
     * la logue et kafkajs rejoue le message ; rejoué, les deux événements sont republiés (core-backend garde le premier de chacun).
     */
    async compute({ executionId, totalInvested, request: { allocations, startDate, endDate } }: Pick<BacktestCompletedPayload, "executionId" | "request" | "totalInvested">): Promise<void> {
        const symbols = allocations.map((allocation) => allocation.symbol);
        const start = new Date(startDate);
        const end = new Date(endDate);

        // La devise de cotation de chaque symbole arrive avec ses dividendes
        const dividends = await this.repo.getDividends(symbols, start, end);
        const currencies = Object.fromEntries(Object.entries(dividends).map(([symbol, { currency }]) => [symbol, currency]));
        // Les taux EUR/devise se lisent comme des cours : une paire par devise étrangère
        const pairs = [...new Set(Object.values(currencies).filter((currency) => currency !== REFERENCE_CURRENCY))].map(fxPairSymbol);
        const closes = await this.repo.getDailyCloses([...symbols, ...pairs], start, end);

        const eurCloses = toEuros(closes, currencies, closes);
        const risk = computeRisk(allocations, eurCloses);
        await this.publisher.completed({ executionId, finishedAt: new Date().toISOString(), risk });
        logger.info("Risk computed", { executionId, computed: risk !== null });

        // Le service peut lire l'horloge, pas l'engine
        const startedAt = performance.now();
        const projection = computeProjection(allocations, eurCloses, totalInvested, PROJECTION_PARAMS.seed);
        const durationMs = Math.round(performance.now() - startedAt);
        await this.publisher.projectionCompleted({ executionId, finishedAt: new Date().toISOString(), durationMs, projection });
        logger.info("Projection computed", { executionId, computed: projection !== null });
    }
}

export default RiskService;
