import { INTERNAL_KEY_HEADER } from "@azimut/contracts";

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
export async function readMarket({ baseUrl, apiKey }: MarketServiceConfig, path: string, symbols: string[], start: Date, end: Date): Promise<unknown> {
    const url = new URL(path, baseUrl);
    url.search = new URLSearchParams({
        symbols: symbols.join(","),
        start: start.toISOString(),
        end: end.toISOString(),
    }).toString();

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
