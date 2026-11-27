import { API_ERROR_CODES, type BasketInputs, type DailyCloses, type Dividends, type MarketAsset, type OptionChain, type OptionInputs, type Paginated, type PaginationQuery, type Period, type RateCurve } from "@azimut/contracts";
import MarketRepository, { type IMarketRepository } from "../repositories/market.repository";
import {
    ASSETS_CACHE_TTL_MS,
    BASKET_CORRELATION_MIN_RETURNS,
    DEFAULT_TICKERS,
    DETAILS_CACHE_TTL_MS,
    PROVIDER_PROBE_CACHE_TTL_MS,
    PROVIDER_PROBE_SYMBOL,
    PROVIDER_PROBE_TIMEOUT_MS,
    RATES_CACHE_TTL_MS,
    OPTION_INPUTS_WINDOW_YEARS,
    SEARCH_CACHE_TTL_MS,
} from "../constants/market.constants";
import { TtlCache } from "../utils/cache";
import { BadGatewayError } from "@azimut/http";
import { addYears, Logger, returnsCorrelation } from "@azimut/utils";

const logger = Logger.here();


class MarketService {

    repo: IMarketRepository = new MarketRepository()

    // Les réponses du fournisseur sont gardées quelques minutes (durées dans `market.constants.ts`) : Yahoo limite les appels répétés
    private cache = new TtlCache()

    async searchMarket(query: string) {
        return this.cache.getOrLoad(`search:${query.trim().toLowerCase()}`, SEARCH_CACHE_TTL_MS, () => this.repo.search(query))
    }

    async getMarketDetails(id: string, period: Period) {
        return this.cache.getOrLoad(`details:${id}:${period}`, DETAILS_CACHE_TTL_MS[period], () => this.repo.getDetails(id, period))
    }

    // Pagine la liste DEFAULT_TICKERS avant l'appel Yahoo : seuls les symboles de la page sont interrogés
    async getDefaultsMarketAssets({ page, pageSize }: PaginationQuery): Promise<Paginated<MarketAsset>> {
        const start = (page - 1) * pageSize
        const symbols = DEFAULT_TICKERS.slice(start, start + pageSize)

        const key = `assets:${symbols.join(",")}`
        const data = await this.cache.getOrLoad(key, ASSETS_CACHE_TTL_MS, () => this.repo.getAssets(symbols))
        // Un actif manquant (échec passager du fournisseur) ne doit pas rester une minute en cache
        if (data.length < symbols.length) this.cache.delete(key)

        return { data, count: DEFAULT_TICKERS.length, page, pageSize }
    }

    async getRateCurve(): Promise<RateCurve> {
        return this.cache.getOrLoad("rates", RATES_CACHE_TTL_MS, () => this.repo.getRateCurve())
    }

    // Jamais mis en cache : spot, volatilité et dividende se lisent au moment du calcul
    async getOptionInputs(symbol: string): Promise<OptionInputs> {
        return this.repo.getOptionInputs(symbol)
    }

    /**
     * Préremplissage d'un produit sur panier (T-11a) : valeurs d'option-inputs de chaque symbole, dans l'ordre demandé, et corrélations
     * des rendements journaliers sur 1 an. Un symbole inconnu lève `NotFoundError` (`SYMBOL_NOT_FOUND`) ; un historique commun
     * de moins de `BASKET_CORRELATION_MIN_RETURNS` rendements (ou une série plate) lève `BadGatewayError` avec `reason`
     * `INSUFFICIENT_HISTORY` et les symboles : jamais de corrélation inventée. Jamais mis en cache.
     */
    async getBasketInputs(symbols: string[]): Promise<BasketInputs> {
        // Les entrées d'abord : un symbole inconnu lève SYMBOL_NOT_FOUND avant la lecture des cours
        const inputs = await Promise.all(symbols.map((symbol) => this.repo.getOptionInputs(symbol, false)))
        const end = new Date()
        const closes = await this.repo.getDailyCloses(symbols, addYears(end, -OPTION_INPUTS_WINDOW_YEARS), end)

        const correlations = returnsCorrelation(symbols.map((symbol) => closes[symbol] ?? []), BASKET_CORRELATION_MIN_RETURNS)
        if (!correlations) {
            logger.warn("Basket correlations unavailable", { symbols })
            throw new BadGatewayError(API_ERROR_CODES.SERVICE_UNAVAILABLE, { reason: "INSUFFICIENT_HISTORY", symbols, minReturns: BASKET_CORRELATION_MIN_RETURNS })
        }

        return { underlyings: inputs.map(({ impliedVolatility: _implied, ...underlying }) => underlying), correlations }
    }

    // Jamais mis en cache : une chaîne d'options est celle du jour, recalculée à chaque demande de pricing
    async getOptionChain(symbol: string, expiration?: string): Promise<OptionChain> {
        return this.repo.getOptionChain(symbol, expiration)
    }

    // Jamais mis en cache : un backtest publie l'empreinte et l'instant de récupération de ces cours (reproductibilité)
    async getDailyCloses(symbols: string[], start: Date, end: Date): Promise<DailyCloses> {
        return this.repo.getDailyCloses(symbols, start, end)
    }

    // Jamais mis en cache : les dividendes entrent dans l'empreinte de reproductibilité d'un backtest, comme les cours
    async getDividends(symbols: string[], start: Date, end: Date): Promise<Dividends> {
        return this.repo.getDividends(symbols, start, end)
    }

    /**
     * Contrôle `provider` de `/readiness` (D10) : `true` si Yahoo répond sur `PROVIDER_PROBE_SYMBOL` en moins de
     * `PROVIDER_PROBE_TIMEOUT_MS`. Ne lève jamais : un échec ou un délai dépassé rend `false`, gardé en cache comme un succès
     * pendant `PROVIDER_PROBE_CACHE_TTL_MS` (le cache n'oublie que les promesses rejetées).
     */
    async isProviderReachable(): Promise<boolean> {
        return this.cache.getOrLoad("probe:provider", PROVIDER_PROBE_CACHE_TTL_MS, () => this.probeProvider())
    }

    private async probeProvider(): Promise<boolean> {
        let timer: ReturnType<typeof setTimeout> | undefined
        const timeout = new Promise<false>((resolve) => {
            timer = setTimeout(() => resolve(false), PROVIDER_PROBE_TIMEOUT_MS)
        })
        try {
            const reachable = await Promise.race([this.repo.ping(PROVIDER_PROBE_SYMBOL).then(() => true as const), timeout])
            if (!reachable) logger.warn("Provider probe timed out", { timeoutMs: PROVIDER_PROBE_TIMEOUT_MS })
            return reachable
        } catch (error) {
            logger.error("Provider probe failed", { error: error instanceof Error ? error.message : String(error) })
            return false
        } finally {
            clearTimeout(timer)
        }
    }
}

export default MarketService;
