import { Logger } from "@azimut/utils";
import type { PricingRequestedPayload } from "@azimut/contracts";
import { MarketClient, type IRateCurveClient } from "@azimut/market-client";
import { priceBond } from "../engine/bonds";
import type { IPricingPublisher } from "../publishers/pricing.publisher";
import { env } from "../env";

const logger = Logger.here();

class PricingService {
    repo: IRateCurveClient = new MarketClient({ baseUrl: env.MARKET_SERVICE_URL, apiKey: env.INTERNAL_API_KEY });

    constructor(private readonly publisher: IPricingPublisher) { }

    /**
     * Exécute un `pricing.requested` : lit la courbe des taux si le taux d'actualisation vient de la courbe, calcule, puis
     * publie `completed`. Toute erreur (courbe indisponible, maturité hors courbe, publication) est publiée en `failed`
     * avec sa cause ; rien n'est relancé.
     */
    async run(request: PricingRequestedPayload): Promise<void> {
        const { requestId, kind, bond } = request;

        try {
            const curve = bond.discount.source === "CURVE" ? (await this.repo.getRateCurve()).points : null;
            const result = { kind, bond: priceBond(bond, curve) };

            await this.publisher.completed({ requestId, finishedAt: new Date().toISOString(), result });
            logger.info("Pricing completed", { requestId, kind, price: result.bond.price });
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            logger.error("Pricing failed", { requestId, kind, error: reason });
            await this.publisher.failed({ requestId, finishedAt: new Date().toISOString(), reason });
        }
    }
}

export default PricingService;
