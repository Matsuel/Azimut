import {
    dailyClosesSchema,
    dividendsSchema,
    optionChainSchema,
    optionInputsSchema,
    rateCurveSchema,
    INTERNAL_KEY_HEADER,
    PRICE_DATA_SOURCE,
    type DailyCloses,
    type DataSource,
    type Dividends,
    type OptionChain,
    type OptionInputs,
    type RateCurve,
} from "@azimut/contracts";

// Délai maximal d'une réponse de market-service : le fournisseur peut mettre du temps sur une longue période ou plusieurs symboles
export const MARKET_SERVICE_TIMEOUT_MS = 60_000;

// Statuts de market-service qui justifient une seconde tentative (indisponible, passerelle, délai) ; un 500 (symbole inconnu) n'en justifie pas
export const RETRYABLE_STATUSES = [502, 503, 504];

export interface MarketServiceConfig {
    // URL de market-service
    baseUrl: string;
    // Clé interne partagée avec market-service
    apiKey: string;
}

/**
 * Corps JSON de `path` (`/api/market/closes`, `/api/market/dividends`) pour ces symboles entre `start` et `end`, à valider par l'appelant.
 * Un appel, puis un seul nouvel essai si market-service est injoignable, dépasse le délai ou répond 502/503/504.
 * Lève une erreur si la réponse est hors 2xx ; le code stable de market-service (`INVALID_QUERY`, `INTERNAL_ERROR`…) figure dans le message.
 */
async function readMarket({ baseUrl, apiKey }: MarketServiceConfig, path: string, symbols: string[], start: Date, end: Date): Promise<unknown> {
    const url = new URL(path, baseUrl);
    url.search = new URLSearchParams({
        symbols: symbols.join(","),
        start: start.toISOString(),
        end: end.toISOString(),
    }).toString();

    return fetchMarket(url, apiKey)
}

/**
 * Corps JSON de `url` avec la clé interne. Un appel, puis un seul nouvel essai si market-service est injoignable, dépasse
 * le délai ou répond 502/503/504. Lève une erreur si la réponse est hors 2xx ; le code stable de market-service
 * (`INVALID_QUERY`, `INTERNAL_ERROR`…) figure dans le message.
 */
async function fetchMarket(url: URL, apiKey: string): Promise<unknown> {
    const call = () =>
        fetch(url, {
            headers: { [INTERNAL_KEY_HEADER]: apiKey },
            signal: AbortSignal.timeout(MARKET_SERVICE_TIMEOUT_MS),
        });
    const first = await call().catch(() => null);
    const response = first && !RETRYABLE_STATUSES.includes(first.status) ? first : await call();

    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        throw new Error(`Market data unavailable (market-service responded ${response.status}${body?.code ? ` ${body.code}` : ""})`);
    }

    return response.json();
}

// Lecture des cours par un engine ; une interface pour que les tests du service la remplacent par un faux
export interface IMarketClient {
    // Fournisseur et type des cours renvoyés par getDailyCloses, publiés avec un résultat
    readonly source: Pick<DataSource, "provider" | "priceType">;
    getDailyCloses(symbols: string[], start: Date, end: Date): Promise<DailyCloses>;
    getDividends(symbols: string[], start: Date, end: Date): Promise<Dividends>;
}

// Lecture de la courbe des taux par le pricing de backtest-engine ; séparée de IMarketClient pour que risk-engine n'ait pas à la fournir
export interface IRateCurveClient {
    getRateCurve(): Promise<RateCurve>;
}

// Lecture des entrées et de la chaîne d'options par le pricing de backtest-engine (19) ; séparée de IMarketClient comme IRateCurveClient
export interface IOptionChainClient {
    getOptionInputs(symbol: string): Promise<OptionInputs>;
    getOptionChain(symbol: string, expiration?: string): Promise<OptionChain>;
}

/** Client de market-service des engines (backtest-engine, risk-engine) : réponses validées par les schémas du contrat. */
export class MarketClient implements IMarketClient, IRateCurveClient, IOptionChainClient {
    readonly source = PRICE_DATA_SOURCE;

    constructor(private readonly config: MarketServiceConfig) { }

    /**
     * Cours de clôture journaliers de chaque symbole entre `start` et `end` (`GET /api/market/closes`) : triés par date,
     * ajustés des splits, pas des dividendes, devise de cotation. Lève une erreur si market-service est injoignable ou
     * répond hors 2xx (symbole inconnu compris), ou si la réponse ne respecte pas le contrat.
     */
    async getDailyCloses(symbols: string[], start: Date, end: Date): Promise<DailyCloses> {
        return dailyClosesSchema.parse(await readMarket(this.config, "/api/market/closes", symbols, start, end));
    }

    /**
     * Dividendes et devise de cotation de chaque symbole entre `start` et `end` (`GET /api/market/dividends`) : triés par
     * date, liste vide sans dividende. Mêmes erreurs que `getDailyCloses`.
     */
    async getDividends(symbols: string[], start: Date, end: Date): Promise<Dividends> {
        return dividendsSchema.parse(await readMarket(this.config, "/api/market/dividends", symbols, start, end));
    }

    /**
     * Courbe des taux US (`GET /api/market/rates`) : un point par maturité, taux en ratio annuel. Mêmes erreurs que
     * `getDailyCloses`.
     */
    async getRateCurve(): Promise<RateCurve> {
        return rateCurveSchema.parse(await fetchMarket(new URL("/api/market/rates", this.config.baseUrl), this.config.apiKey))
    }

    /**
     * Spot, rendement du dividende et volatilité 1 an d'un symbole (`GET /api/market/option-inputs`). Lève une erreur si market-service
     * est injoignable ou répond hors 2xx (symbole inconnu compris : `SYMBOL_NOT_FOUND`), ou si la réponse ne respecte pas le contrat.
     */
    async getOptionInputs(symbol: string): Promise<OptionInputs> {
        const url = new URL("/api/market/option-inputs", this.config.baseUrl);
        url.search = new URLSearchParams({ symbol }).toString();
        return optionInputsSchema.parse(await fetchMarket(url, this.config.apiKey));
    }

    /**
     * Chaîne d'options du jour d'un symbole pour une échéance `YYYY-MM-DD`, la plus proche sans `expiration` (`GET /api/market/options`).
     * Mêmes erreurs que `getOptionInputs`.
     */
    async getOptionChain(symbol: string, expiration?: string): Promise<OptionChain> {
        const url = new URL("/api/market/options", this.config.baseUrl);
        url.search = new URLSearchParams(expiration ? { symbol, expiration } : { symbol }).toString();
        return optionChainSchema.parse(await fetchMarket(url, this.config.apiKey));
    }
}
