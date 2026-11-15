import { Logger, REFERENCE_CURRENCY, fxPairSymbol } from "@azimut/utils";
import type { BacktestCompletedPayload } from "@azimut/contracts";
import computeRisk from "../engine/risk.engine";
import { toEuros } from "../engine/risk.utils";
import type { IRiskPublisher } from "../publishers/risk.publisher";
import MarketRepository, { type IMarketRepository } from "../repositories/market.repository";

const logger = Logger.here();

class RiskService {
    repo: IMarketRepository = new MarketRepository();

    constructor(private readonly publisher: IRiskPublisher) { }

    /**
     * Calcule le risque d'un `backtest.completed` et publie `risk.completed` (`risk` null sous 250 jours communs).
     * Une erreur (market-service injoignable, taux de change manquant) n'est pas capturée : le consommateur la logue et kafkajs
     * rejoue le message ; rejoué, l'événement republie le même résultat (core-backend garde la transition).
     */
    async compute({ executionId, request: { allocations, startDate, endDate } }: Pick<BacktestCompletedPayload, "executionId" | "request">): Promise<void> {
        const symbols = allocations.map((allocation) => allocation.symbol);
        const start = new Date(startDate);
        const end = new Date(endDate);

        const currencies = await this.repo.getCurrencies(symbols, start, end);
        // Les taux EUR/devise se lisent comme des cours : une paire par devise étrangère
        const pairs = [...new Set(Object.values(currencies).filter((currency) => currency !== REFERENCE_CURRENCY))].map(fxPairSymbol);
        const closes = await this.repo.getDailyCloses([...symbols, ...pairs], start, end);

        const risk = computeRisk(allocations, toEuros(closes, currencies, closes));
        await this.publisher.completed({ executionId, finishedAt: new Date().toISOString(), risk });
        logger.info("Risk computed", { executionId, computed: risk !== null });
    }
}

export default RiskService;
