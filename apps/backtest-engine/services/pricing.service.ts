import { DAY_MS, historicalVolatility, Logger } from "@azimut/utils";
import { SMILE_EXPIRATIONS, type OptionChainResult, type PricingRequestedPayload, type PricingResult } from "@azimut/contracts";
import { MarketClient, type IMarketClient, type IOptionChainClient, type IRateCurveClient } from "@azimut/market-client";
import { priceBond } from "../engine/bonds";
import { priceOption } from "../engine/options";
import { priceOptionMonteCarlo } from "../engine/options.mc";
import { analyseChain } from "../engine/options.chain";
import { HISTORICAL_VOLATILITY_DAYS, HISTORICAL_VOLATILITY_LOOKBACK_DAYS, MONTE_CARLO_SEED, SMILE_MIN_DAYS } from "../constants/pricing.constants";
import type { IPricingPublisher } from "../publishers/pricing.publisher";
import { env } from "../env";

const logger = Logger.here();

class PricingService {
    repo: IRateCurveClient & IOptionChainClient & Pick<IMarketClient, "getDailyCloses"> = new MarketClient({ baseUrl: env.MARKET_SERVICE_URL, apiKey: env.INTERNAL_API_KEY });

    // Horloge injectable : jour de la chaîne et fenêtre de la volatilité historique (substituable en test)
    now: () => Date = () => new Date();

    constructor(private readonly publisher: IPricingPublisher) { }

    /**
     * Exécute un `pricing.requested` : une obligation lit la courbe des taux si son taux d'actualisation en vient, une option
     * (Black-Scholes ou Monte Carlo, graine fixe) se calcule sur ses seuls paramètres, une chaîne d'options lit market-service (chaîne, taux, dividende, cours) ; puis publie `completed`. Toute erreur (courbe indisponible, maturité hors
     * courbe, publication) est publiée en `failed` avec sa cause ; rien n'est relancé.
     */
    async run(request: PricingRequestedPayload): Promise<void> {
        const { requestId, kind } = request;

        try {
            const result = await this.compute(request);

            await this.publisher.completed({ requestId, finishedAt: new Date().toISOString(), result });
            logger.info("Pricing completed", { requestId, kind });
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            logger.error("Pricing failed", { requestId, kind, error: reason });
            await this.publisher.failed({ requestId, finishedAt: new Date().toISOString(), reason });
        }
    }

    private async compute(request: PricingRequestedPayload): Promise<PricingResult> {
        if (request.kind === "OPTION") return { kind: "OPTION", option: priceOption(request.option) };

        if (request.kind === "OPTION_MC") return { kind: "OPTION_MC", monteCarlo: priceOptionMonteCarlo(request.monteCarlo, MONTE_CARLO_SEED) };

        if (request.kind === "OPTION_CHAIN") return { kind: "OPTION_CHAIN", chain: await this.computeChain(request.chain.symbol) };

        const { bond } = request;
        const curve = bond.discount.source === "CURVE" ? (await this.repo.getRateCurve()).points : null;
        return { kind: "BOND", bond: priceBond(bond, curve) };
    }

    /**
     * Chaîne d'options d'un symbole (19) : les `SMILE_EXPIRATIONS` premières échéances à au moins `SMILE_MIN_DAYS` jours, le taux court
     * de la courbe US, le dividende et la volatilité historique 30 jours ; le calcul est celui de `analyseChain`. Lève si market-service
     * répond en erreur, ou si aucune échéance n'est assez lointaine.
     */
    private async computeChain(symbol: string): Promise<OptionChainResult> {
        const now = this.now();
        const asOf = now.toISOString().slice(0, 10);
        const [inputs, nearest, curve, closes] = await Promise.all([
            this.repo.getOptionInputs(symbol),
            this.repo.getOptionChain(symbol),
            this.repo.getRateCurve(),
            this.repo.getDailyCloses([symbol], new Date(now.getTime() - HISTORICAL_VOLATILITY_LOOKBACK_DAYS * DAY_MS), now),
        ]);

        const minExpiration = new Date(now.getTime() + SMILE_MIN_DAYS * DAY_MS).toISOString().slice(0, 10);
        const expirations = nearest.expirations.filter((expiration) => expiration >= minExpiration).slice(0, SMILE_EXPIRATIONS);
        if (expirations.length === 0) throw new Error(`No option expiration at least ${SMILE_MIN_DAYS} days away for ${symbol}`);

        const chains = await Promise.all(
            expirations.map(async (expiration) => (expiration === nearest.expiration ? nearest : this.repo.getOptionChain(symbol, expiration))),
        );
        const recentCloses = (closes[symbol] ?? []).slice(-(HISTORICAL_VOLATILITY_DAYS + 1)).map((point) => point.close);

        return analyseChain({
            symbol,
            asOf,
            // Spot de la chaîne : même devise de cotation que les strikes (`inputs.spot` est en devise principale)
            spot: nearest.spot,
            rate: curve.points[0]!.rate,
            dividendYield: inputs.dividendYield,
            historicalVolatility: historicalVolatility(recentCloses),
            expirations: chains.map(({ expiration, calls, puts }) => ({ expiration, calls, puts })),
        });
    }
}

export default PricingService;
