import YahooFinance from "yahoo-finance2";
import type { ChartOptions } from "yahoo-finance2/modules/chart";
import { API_ERROR_CODES, type DailyCloses, type Dividends, type MarketAsset, type MarketData, type MarketDetails, type OptionChain, type OptionInputs, type OptionQuote, type Period, type RateCurve } from "@azimut/contracts";
import { BadGatewayError, NotFoundError } from "@azimut/http";
import { env } from "../env";
import { addYears, DAY_MS, historicalVolatility, Logger, round } from "@azimut/utils";
import { toMajorCurrency } from "../utils/currency";
import { IMPLIED_VOLATILITY_MIN_DAYS, OPTION_INPUTS_WINDOW_YEARS, RATE_CURVE_CURRENCY, RATE_CURVE_SYMBOLS } from "../constants/market.constants";
import { trailingDividendYield } from "../utils/option-inputs";

const logger = Logger.here();

export interface IMarketRepository {
    search(query: string): Promise<MarketData[]>
    getDetails(id: string, period: Period): Promise<MarketDetails[]>
    getAssets(symbols: string[]): Promise<MarketAsset[]>;
    getDailyCloses(symbols: string[], start: Date, end: Date): Promise<DailyCloses>;
    getDividends(symbols: string[], start: Date, end: Date): Promise<Dividends>;
    getRateCurve(): Promise<RateCurve>;
    getOptionInputs(symbol: string, withImpliedVolatility?: boolean): Promise<OptionInputs>;
    getOptionChain(symbol: string, expiration?: string): Promise<OptionChain>;
    ping(symbol: string): Promise<void>;
}

class MarketRepository implements IMarketRepository {

    private static yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey']});

    async search(query: string): Promise<MarketData[]> {
        const results = await MarketRepository.yahooFinance.search(query)

        // Les résultats hors Yahoo n'ont ni symbole ni place de cotation : ils seraient filtrés plus bas
        const formattedResults: MarketData[] = results.quotes
            .filter((quote) => quote.isYahooFinance)
            .map((quote) => ({
                symbol: quote.symbol,
                name: quote.shortname || quote.longname || quote.symbol,
                exchange: quote.exchange,
                assetType: quote.quoteType,
                logoUrl: MarketRepository.logoUrl(quote.symbol),
            }))

        return formattedResults.filter((item) => item.name && item.exchange && item.assetType)
    }

    async getDetails(id: string, period: Period): Promise<MarketDetails[]> {
        const now = new Date()

        const config: Record<Period, { period1: Date, interval: ChartOptions["interval"] }> = {
            '1d': { period1: new Date(now.getTime() - DAY_MS), interval: '5m' },
            '1w': { period1: new Date(now.getTime() - 7 * DAY_MS), interval: '1h' },
            '1m': { period1: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()), interval: '1d' },
            '1y': { period1: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()), interval: '1wk' },
            'max': { period1: new Date(0), interval: '1mo' },
        }

        const { period1, interval } = config[period]

        const details = await MarketRepository.yahooFinance.chart(id, {
            period1: period1,
            interval: interval,
        })

        if (!details) {
            throw new BadGatewayError()
        }

        return MarketRepository.toHistory(details.quotes)
    }

    /**
     * Récupère les cotations des symboles demandés, dans leur ordre.
     * Un actif indisponible est omis et ne bloque pas les autres.
     */
    async getAssets(symbols: string[]): Promise<MarketAsset[]> {
        const results = await Promise.allSettled(
            symbols.map(async (symbol) => {
                const [quote, chart] = await Promise.all([
                    MarketRepository.yahooFinance.quote(symbol),
                    MarketRepository.yahooFinance.chart(symbol, {
                        period1: new Date(Date.now() - DAY_MS),
                        interval: "1h",
                    }),
                ]);

                const history = MarketRepository.toHistory(chart.quotes);

                return {
                    symbol: quote.symbol,
                    name:
                        quote.shortName ??
                        quote.longName ??
                        quote.symbol,
                    price: quote.regularMarketPrice ?? null,
                    change24h:
                        quote.regularMarketChangePercent ?? null,
                    volume24h: quote.regularMarketVolume ?? null,
                    history,
                    logoUrl: MarketRepository.logoUrl(quote.symbol),
                } satisfies MarketAsset;
            }),
        );

        return results.flatMap((result, index) => {
            if (result.status === "fulfilled") {
                return [result.value];
            }

            logger.error(`Impossible de récupérer ${symbols[index]}`, {
                reason: result.reason,
            });

            return [];
        });
    }

    /**
     * Cours de clôture journaliers de chaque symbole entre `start` et `end`, triés par date.
     * Clôtures ajustées des splits, pas des dividendes ; jours sans clôture écartés. Un symbole inconnu lève l'erreur du fournisseur.
     * Devise de cotation ramenée à la devise principale (`toMajorCurrency`) : un cours en pence est rendu en livres.
     */
    async getDailyCloses(symbols: string[], start: Date, end: Date): Promise<DailyCloses> {
        const series = await Promise.all(
            symbols.map(async (symbol) => {
                const { chart, toDay, divisor } = await MarketRepository.fetchChart(symbol, { period1: start, period2: end })
                const points = chart.quotes
                    .filter((quote) => quote.close != null)
                    .map((quote) => ({ date: toDay.format(quote.date), close: quote.close! / divisor }))

                return [symbol, points] as const
            }),
        )

        return Object.fromEntries(series)
    }

    /**
     * Dividendes de chaque symbole entre `start` et `end`, triés par date, avec sa devise de cotation.
     * Montants par titre ajustés des splits par le fournisseur, dans la devise principale (`toMajorCurrency`) ; liste vide sans dividende. Un symbole inconnu lève l'erreur du fournisseur.
     */
    async getDividends(symbols: string[], start: Date, end: Date): Promise<Dividends> {
        const series = await Promise.all(
            symbols.map(async (symbol) => {
                const { chart, toDay, currency, divisor } = await MarketRepository.fetchChart(symbol, { period1: start, period2: end, events: "div" })
                const dividends = (chart.events?.dividends ?? [])
                    .map((dividend) => ({ date: toDay.format(dividend.date), amount: dividend.amount / divisor }))
                    .sort((a, b) => a.date.localeCompare(b.date))

                return [symbol, { currency, dividends }] as const
            }),
        )

        return Object.fromEntries(series)
    }

    /**
     * Courbe des taux US : dernier niveau des indices `RATE_CURVE_SYMBOLS`, triés par maturité. Le pourcentage de Yahoo
     * (4.21) est converti en ratio (0.0421, arrondi à 6 décimales) ici, une seule fois (D1). Un indice sans cotation lève `BadGatewayError` :
     * une courbe à trous fausserait l'interpolation.
     */
    async getRateCurve(): Promise<RateCurve> {
        const points = await Promise.all(
            RATE_CURVE_SYMBOLS.map(async ({ symbol, maturityYears }) => {
                const quote = await MarketRepository.yahooFinance.quote(symbol)
                if (quote.regularMarketPrice == null || !quote.regularMarketTime) throw new BadGatewayError()

                // Jour de cotation dans le fuseau de la place, comme les clôtures
                const toDay = new Intl.DateTimeFormat("en-CA", { timeZone: quote.exchangeTimezoneName ?? "UTC" })
                return { symbol, maturityYears, rate: round(quote.regularMarketPrice / 100, 6), date: toDay.format(quote.regularMarketTime) }
            }),
        )

        return { currency: RATE_CURVE_CURRENCY, points }
    }

    /**
     * Préremplissage du calculateur d'option (D2, D4) : dernier cours (`quote`), volatilité historique 1 an annualisée sur 252 jours
     * et dividendes des 12 derniers mois rapportés au cours (une seule série `chart` avec `events: "div"`). Montants dans la devise
     * principale (`toMajorCurrency`). `volatility` vaut `null` sans historique suffisant. `withImpliedVolatility: false` saute la lecture de la chaîne d'options (`impliedVolatility` vaut alors `null`). Un symbole inconnu ou sans cours lève
     * `NotFoundError` (`SYMBOL_NOT_FOUND`).
     */
    async getOptionInputs(symbol: string, withImpliedVolatility = true): Promise<OptionInputs> {
        const quote = await MarketRepository.yahooFinance.quote(symbol)
        // Un cours nul ou négatif ne se price pas : traité comme un symbole sans cours
        if (!quote || quote.regularMarketPrice == null || quote.regularMarketPrice <= 0) throw new NotFoundError(API_ERROR_CODES.SYMBOL_NOT_FOUND)

        const end = new Date()
        const { chart, divisor, currency } = await MarketRepository.fetchChart(symbol, {
            period1: addYears(end, -OPTION_INPUTS_WINDOW_YEARS),
            period2: end,
            events: "div",
        })
        // Le cours de `quote` suit la devise de cotation du `chart` (même place) : même diviseur pour le cours et les dividendes
        const spot = quote.regularMarketPrice / divisor
        // Le contrat exige spot > 0 après arrondi à 4 décimales
        if (round(spot, 4) <= 0) throw new NotFoundError(API_ERROR_CODES.SYMBOL_NOT_FOUND)
        const closes = chart.quotes.filter((point) => point.close != null).map((point) => point.close! / divisor)
        const volatility = historicalVolatility(closes)
        const dividends = (chart.events?.dividends ?? []).map((dividend) => dividend.amount / divisor)

        return {
            symbol,
            currency,
            spot: round(spot, 4),
            dividendYield: round(trailingDividendYield(dividends, spot), 6),
            volatility: volatility == null ? null : round(volatility, 6),
            impliedVolatility: withImpliedVolatility ? await this.getImpliedVolatility(symbol) : null,
        }
    }

    /**
     * Volatilité implicite de Yahoo (ratio annuel) : option (moyenne call et put si les deux en ont une) au strike le plus proche du cours,
     * sur la première échéance à au moins `IMPLIED_VOLATILITY_MIN_DAYS` jours. `null` sans chaîne, sans échéance assez lointaine ou sans
     * implicite non nulle. Ne lève jamais : une chaîne en erreur est loggée (`warn`) et ne fait pas échouer `getOptionInputs`.
     */
    private async getImpliedVolatility(symbol: string): Promise<number | null> {
        try {
            const first = await this.getOptionChain(symbol)
            const limit = Date.now() + IMPLIED_VOLATILITY_MIN_DAYS * DAY_MS
            const expiration = first.expirations.find((day) => new Date(`${day}T00:00:00Z`).getTime() >= limit)
            if (!expiration) return null

            const chain = expiration === first.expiration ? first : await this.getOptionChain(symbol, expiration)
            const strikes = [...chain.calls, ...chain.puts].map((quote) => quote.strike)
            if (strikes.length === 0) return null
            const strike = strikes.reduce((best, value) => (Math.abs(value - chain.spot) < Math.abs(best - chain.spot) ? value : best))

            const values = [...chain.calls, ...chain.puts]
                .filter((quote) => quote.strike === strike && quote.yahooVolatility != null && quote.yahooVolatility > 0)
                .map((quote) => quote.yahooVolatility!)
            if (values.length === 0) return null
            return round(values.reduce((sum, value) => sum + value, 0) / values.length, 6)
        } catch (error) {
            logger.warn("Implied volatility unavailable", { symbol, error: error instanceof Error ? error.message : String(error) })
            return null
        }
    }

    /**
     * Chaîne d'options du jour (19, D5) : cotations brutes de Yahoo (`options`) d'une échéance, `YYYY-MM-DD` (UTC, comme Yahoo), la plus
     * proche si `expiration` est absente ; `expirations` liste toutes les échéances disponibles. Les valeurs sont dans la devise de
     * cotation du sous-jacent, sans conversion : le filtre et le calcul sont ceux de backtest-engine. Un symbole sans chaîne
     * (inconnu, sans options, échéance absente) lève `NotFoundError` (`SYMBOL_NOT_FOUND`).
     */
    async getOptionChain(symbol: string, expiration?: string): Promise<OptionChain> {
        const result = await MarketRepository.yahooFinance.options(symbol, expiration ? { date: new Date(`${expiration}T00:00:00Z`) } : {})
        const spot = result?.quote?.regularMarketPrice
        const chain = result?.options?.[0]
        if (!chain || spot == null || spot <= 0) throw new NotFoundError(API_ERROR_CODES.SYMBOL_NOT_FOUND)

        const quotes = (contracts: typeof chain.calls): OptionQuote[] =>
            contracts.map((contract) => ({
                strike: contract.strike,
                bid: contract.bid ?? 0,
                ask: contract.ask ?? 0,
                lastPrice: contract.lastPrice ?? 0,
                volume: contract.volume ?? null,
                yahooVolatility: contract.impliedVolatility ?? null,
            }))
        const toDay = (date: Date) => date.toISOString().slice(0, 10)

        return {
            symbol,
            spot: round(spot, 4),
            expirations: result.expirationDates.map(toDay).sort(),
            expiration: toDay(chain.expirationDate),
            calls: quotes(chain.calls),
            puts: quotes(chain.puts),
        }
    }

    /** Requête légère (cotation d'un symbole) qui lève l'erreur du fournisseur s'il ne répond pas. Sert à `/readiness`. */
    async ping(symbol: string): Promise<void> {
        await MarketRepository.yahooFinance.quote(symbol)
    }

    // Série journalière avec le formateur de jour de cotation et la devise principale de la place : clôtures et ex-dates se lisent pareil
    private static async fetchChart(symbol: string, options: Pick<ChartOptions, "period1" | "period2" | "events">) {
        const chart = await MarketRepository.yahooFinance.chart(symbol, { ...options, interval: "1d" })
        // Jour de cotation dans le fuseau de la place : en UTC, Tokyo ou Sydney tomberaient la veille
        const toDay = new Intl.DateTimeFormat("en-CA", { timeZone: chart.meta.exchangeTimezoneName })
        return { chart, toDay, ...toMajorCurrency(chart.meta.currency) }
    }

    // Un intervalle sans clôture (marché fermé, donnée manquante) est omis
    private static toHistory(quotes: { date: Date; close?: number | null }[]): MarketDetails[] {
        return quotes
            .filter((quote) => quote.close != null)
            .map((quote) => ({ date: quote.date.toISOString(), price: quote.close! }))
    }

    private static logoUrl(symbol: string): string | undefined {
        return symbol && env.LOGO_DEV_TOKEN
            ? `https://img.logo.dev/ticker/${symbol}?token=${env.LOGO_DEV_TOKEN}&size=64`
            : undefined
    }
}

export default MarketRepository;