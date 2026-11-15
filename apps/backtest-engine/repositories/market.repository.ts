import { dailyClosesSchema, dividendsSchema, PRICE_DATA_SOURCE, type DataSource, type Dividends } from "@azimut/contracts";
import { readMarket } from "@azimut/market-client";
import { env } from "../env";
import type { PriceSeries } from "../interfaces/backtest.interface";

export interface IMarketRepository {
    // Fournisseur et type de cours renvoyés par getDailyCloses, publiés avec le résultat
    readonly source: Pick<DataSource, "provider" | "priceType">;
    getDailyCloses(symbols: string[], start: Date, end: Date): Promise<PriceSeries>;
    getDividends(symbols: string[], start: Date, end: Date): Promise<Dividends>;
}

const marketService = { baseUrl: env.MARKET_SERVICE_URL, apiKey: env.INTERNAL_API_KEY };

class MarketRepository implements IMarketRepository {

    readonly source = PRICE_DATA_SOURCE;

    /**
     * Cours de clôture journaliers de chaque symbole entre `start` et `end`, lus auprès de market-service (`GET /api/market/closes`),
     * seul service qui appelle le fournisseur. Triés par date, ajustés des splits, pas des dividendes ; jours sans clôture écartés.
     * Lève une erreur si market-service est injoignable ou répond hors 2xx (symbole inconnu compris).
     */
    async getDailyCloses(symbols: string[], start: Date, end: Date): Promise<PriceSeries> {
        return dailyClosesSchema.parse(await readMarket(marketService, "/api/market/closes", symbols, start, end));
    }

    /**
     * Dividendes et devise de cotation de chaque symbole entre `start` et `end`, lus auprès de market-service
     * (`GET /api/market/dividends`) : triés par date, liste vide sans dividende. Mêmes erreurs que `getDailyCloses`.
     */
    async getDividends(symbols: string[], start: Date, end: Date): Promise<Dividends> {
        return dividendsSchema.parse(await readMarket(marketService, "/api/market/dividends", symbols, start, end));
    }
}

export default MarketRepository;
