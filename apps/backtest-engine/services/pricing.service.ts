import { Logger } from "@azimut/utils";
import type { PricingRequestedPayload, PricingResult } from "@azimut/contracts";
import { MarketClient, type IRateCurveClient } from "@azimut/market-client";
import { priceBond } from "../engine/bonds";
import { priceOption } from "../engine/options";
import type { IPricingPublisher } from "../publishers/pricing.publisher";
import { env } from "../env";

const logger = Logger.here();

class PricingService {
    repo: IRateCurveClient = new MarketClient({ baseUrl: env.MARKET_SERVICE_URL, apiKey: env.INTERNAL_API_KEY });

    constructor(private readonly publisher: IPricingPublisher) { }

    /**
     * Exécute un `pricing.requested` : une obligation lit la courbe des taux si son taux d'actualisation en vient, une option
     * se calcule sur ses seuls paramètres ; puis publie `completed`. Toute erreur (courbe indisponible, maturité hors
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

        const { bond } = request;
        const curve = bond.discount.source === "CURVE" ? (await this.repo.getRateCurve()).points : null;
        return { kind: "BOND", bond: priceBond(bond, curve) };
    }
}

export default PricingService;
