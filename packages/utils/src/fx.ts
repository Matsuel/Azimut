/** Devise de référence : les versements, valeurs et rendements sont en euros. */
export const REFERENCE_CURRENCY = "EUR";

/** Symbole yahoo de la paire qui cote 1 € en `currency` (`EURUSD=X` = dollars par euro). */
export const fxPairSymbol = (currency: string) => `${REFERENCE_CURRENCY}${currency}=X`;

/**
 * Taux du jour `date` : dernier taux connu à cette date, ou le premier de la série si `date` le précède
 * (un départ un week-end n'a pas de taux la veille). `rates` triés par date, non vide.
 */
export function rateOn(rates: { date: string; close: number }[], date: string): number {
    let low = 0;
    let high = rates.length;
    while (low < high) {
        const middle = (low + high) >> 1;
        if (rates[middle]!.date <= date) low = middle + 1;
        else high = middle;
    }
    return rates[Math.max(low - 1, 0)]!.close;
}
