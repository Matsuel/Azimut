import { dailyClosesSchema, dividendsSchema, type DailyCloses } from "@azimut/contracts";
import { readMarket } from "@azimut/market-client";
import { env } from "../env";

export interface IMarketRepository {
    getDailyCloses(symbols: string[], start: Date, end: Date): Promise<DailyCloses>;
    getCurrencies(symbols: string[], start: Date, end: Date): Promise<Record<string, string>>;
}

const marketService = { baseUrl: env.MARKET_SERVICE_URL, apiKey: env.INTERNAL_API_KEY };

class MarketRepository implements IMarketRepository {
    /**
     * Cours de clôture journaliers de chaque symbole entre `start` et `end`, lus auprès de market-service (`GET /api/market/closes`),
     * seul service qui appelle le fournisseur. Triés par date, ajustés des splits, devise de cotation.
     * Lève une erreur si market-service est injoignable ou répond hors 2xx (symbole inconnu compris).
     */
    async getDailyCloses(symbols: string[], start: Date, end: Date): Promise<DailyCloses> {
        return dailyClosesSchema.parse(await readMarket(marketService, "/api/market/closes", symbols, start, end));
    }

    /**
     * Devise de cotation (ISO 4217) de chaque symbole, lue avec les dividendes (`GET /api/market/dividends`), seule route qui la donne.
     * Mêmes erreurs que `getDailyCloses`.
     */
    async getCurrencies(symbols: string[], start: Date, end: Date): Promise<Record<string, string>> {
        const data = dividendsSchema.parse(await readMarket(marketService, "/api/market/dividends", symbols, start, end));
        return Object.fromEntries(Object.entries(data).map(([symbol, { currency }]) => [symbol, currency]));
    }
}

export default MarketRepository;
