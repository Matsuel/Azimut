import YahooFinance from "yahoo-finance2";
import type { ChartOptions } from "yahoo-finance2/modules/chart";
import { API_ERROR_CODES, type DailyCloses, type Dividends, type MarketAsset, type MarketData, type MarketDetails, type OptionInputs, type Period, type RateCurve } from "@azimut/contracts";
import { BadGatewayError, NotFoundError } from "@azimut/http";
import { env } from "../env";
import { addYears, DAY_MS, historicalVolatility, Logger, round } from "@azimut/utils";
import { toMajorCurrency } from "../utils/currency";
import { OPTION_INPUTS_WINDOW_YEARS, RATE_CURVE_CURRENCY, RATE_CURVE_SYMBOLS } from "../constants/market.constants";
import { trailingDividendYield } from "../utils/option-inputs";

const logger = Logger.here();

export interface IMarketRepository {
    search(query: string): Promise<MarketData[]>
    getDetails(id: string, period: Period): Promise<MarketDetails[]>
    getAssets(symbols: string[]): Promise<MarketAsset[]>;
    getDailyCloses(symbols: string[], start: Date, end: Date): Promise<DailyCloses>;
    getDividends(symbols: string[], start: Date, end: Date): Promise<Dividends>;
    getRateCurve(): Promise<RateCurve>;
    getOptionInputs(symbol: string): Promise<OptionInputs>;
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
     * principale (`toMajorCurrency`). `volatility` vaut `null` sans historique suffisant. Un symbole inconnu ou sans cours lève
     * `NotFoundError` (`SYMBOL_NOT_FOUND`).
     */
    async getOptionInputs(symbol: string): Promise<OptionInputs> {
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