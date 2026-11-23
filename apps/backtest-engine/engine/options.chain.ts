import type { ChainRow, OptionChainResult, OptionQuote, QuoteStatus, SmileCurve } from "@azimut/contracts";
import { DAY_MS, round } from "@azimut/utils";
import { ImpliedVolatilityError, impliedVolatility, optionGreeks, type OptionTerms } from "./options";

// Jours calendaires par an : maturité d'une échéance = jours restants / 365, comme le calculateur d'option (18)
const DAYS_PER_YEAR = 365;

/** Cotations d'une échéance, telles que lues auprès de market-service. */
export interface ChainExpiration {
    // YYYY-MM-DD
    expiration: string;
    calls: OptionQuote[];
    puts: OptionQuote[];
}

export interface ChainInput {
    symbol: string;
    // Jour de la chaîne, YYYY-MM-DD
    asOf: string;
    // Devise du sous-jacent
    spot: number;
    // Ratio annuel continu : taux sans risque commun à toutes les échéances
    rate: number;
    // Ratio annuel continu : rendement du dividende
    dividendYield: number;
    // Ratio annuel ; null sans historique suffisant
    historicalVolatility: number | null;
    // De la plus proche à la plus lointaine ; la première est détaillée ligne à ligne
    expirations: ChainExpiration[];
}

/** Années entre deux jours `YYYY-MM-DD` (calendaires, /365). Lève si l'échéance n'est pas postérieure au jour de la chaîne. */
function yearsBetween(asOf: string, expiration: string): number {
    const days = (Date.parse(expiration) - Date.parse(asOf)) / DAY_MS;
    if (!(days > 0)) throw new Error(`Option expiration ${expiration} is not after ${asOf}`);
    return days / DAYS_PER_YEAR;
}

/**
 * Filtre de qualité puis calcul d'une cotation (19, D1 et D2). Écartée : bid et ask nuls (`NO_BID_ASK`), un seul des deux nul ou
 * ask < bid (`NO_PRICE`, pas de prix milieu fiable), prix milieu hors des bornes de volatilité implicite (`IV_OUT_OF_BOUNDS`).
 * Retenue : la volatilité implicite est celle du moteur sur le prix milieu, jamais celle de Yahoo ; les grecques s'en déduisent.
 */
function classifyQuote(side: "CALL" | "PUT", quote: OptionQuote, terms: OptionTerms): ChainRow {
    const { strike, bid, ask, yahooVolatility } = quote;
    const row = { strike, side, bid, ask, yahooVolatility };
    const dropped = (status: QuoteStatus, mid: number | null): ChainRow => ({
        ...row,
        mid: mid === null ? null : round(mid, 4),
        impliedVolatility: null,
        status,
        greeks: null,
    });

    if (bid <= 0 && ask <= 0) return dropped("NO_BID_ASK", null);
    if (bid <= 0 || ask <= 0 || ask < bid) return dropped("NO_PRICE", null);

    const mid = (bid + ask) / 2;
    const option = { ...terms, strike };
    let volatility: number;
    try {
        volatility = impliedVolatility(side, mid, option);
    } catch (error) {
        if (error instanceof ImpliedVolatilityError) return dropped("IV_OUT_OF_BOUNDS", mid);
        throw error;
    }

    const greeks = optionGreeks(side, { ...option, volatility });
    return {
        ...row,
        mid: round(mid, 4),
        impliedVolatility: round(volatility, 6),
        status: "KEPT",
        greeks: {
            delta: round(greeks.delta, 6),
            gamma: round(greeks.gamma, 6),
            vega: round(greeks.vega, 6),
            theta: round(greeks.theta, 6),
            rho: round(greeks.rho, 6),
        },
    };
}

/** Lignes d'une échéance, calls puis puts, triées par strike. */
function classifyExpiration({ calls, puts }: ChainExpiration, terms: OptionTerms): ChainRow[] {
    const rows = (side: "CALL" | "PUT", quotes: OptionQuote[]) =>
        quotes.map((quote) => classifyQuote(side, quote, terms)).sort((a, b) => a.strike - b.strike);
    return [...rows("CALL", calls), ...rows("PUT", puts)];
}

/** Courbe de smile d'une échéance : les contrats retenus hors de la monnaie (put sous le spot, call au-dessus), D4. */
function smileOf(expiration: string, rows: ChainRow[], spot: number): SmileCurve {
    const points = rows
        .filter((row) => row.status === "KEPT" && (row.side === "PUT" ? row.strike < spot : row.strike >= spot))
        .map((row) => ({ strike: row.strike, impliedVolatility: row.impliedVolatility! }))
        .sort((a, b) => a.strike - b.strike);
    return { expiration, points };
}

/**
 * Volatilité implicite, grecques et smile d'une chaîne d'options (19) : toutes les cotations passent par le filtre, le nombre de
 * contrats écartés est publié par cause (D2). La première échéance est détaillée ligne à ligne ; la volatilité « ATM » est celle du
 * contrat retenu le plus proche du spot sur cette échéance (call si égalité). Lève si une échéance n'est pas postérieure à `asOf`,
 * ou si `expirations` est vide.
 */
export function analyseChain(input: ChainInput): OptionChainResult {
    const { symbol, asOf, spot, rate, dividendYield, historicalVolatility, expirations } = input;
    const first = expirations[0];
    if (!first) throw new Error("Option chain without expiration");

    const analysed = expirations.map((entry) => {
        const terms: OptionTerms = { spot, strike: 0, maturityYears: yearsBetween(asOf, entry.expiration), rate, dividendYield };
        return { expiration: entry.expiration, rows: classifyExpiration(entry, terms) };
    });
    const allRows = analysed.flatMap(({ rows }) => rows);
    const countOf = (status: QuoteStatus) => allRows.filter((row) => row.status === status).length;
    const chain = analysed[0]!.rows;
    const atm = chain
        .filter((row) => row.status === "KEPT")
        .reduce<ChainRow | null>((best, row) => (best === null || Math.abs(row.strike - spot) < Math.abs(best.strike - spot) ? row : best), null);

    const historical = historicalVolatility === null ? null : round(historicalVolatility, 6);
    const atmVolatility = atm?.impliedVolatility ?? null;

    return {
        symbol,
        asOf,
        spot,
        rate,
        dividendYield,
        contractsTotal: allRows.length,
        contractsKept: countOf("KEPT"),
        discarded: { noBidAsk: countOf("NO_BID_ASK"), noPrice: countOf("NO_PRICE"), ivOutOfBounds: countOf("IV_OUT_OF_BOUNDS") },
        atmVolatility,
        historicalVolatility: historical,
        volatilityPremium: atmVolatility === null || historical === null ? null : round(atmVolatility - historical, 6),
        smile: analysed.map(({ expiration, rows }) => smileOf(expiration, rows, spot)),
        chainExpiration: first.expiration,
        chain,
    };
}
