import { apiFetch } from "@/lib/api"
import type { OptionInputs, PricingInput, PricingView, RateCurve } from "./types"

export async function getRateCurve(): Promise<RateCurve> {
    return apiFetch<RateCurve>("/market/rates")
}

/** Demande le calcul d'un prix ; la vue renvoyée est `PENDING`, le résultat arrive par `getPricing`. */
export async function createPricing(input: PricingInput): Promise<PricingView> {
    return apiFetch<PricingView>("/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    })
}

export async function getPricing(id: string): Promise<PricingView> {
    return apiFetch<PricingView>(`/pricing/${id}`)
}

/** `GET /api/market/option-inputs` : spot, rendement du dividende et volatilité 1 an d'un symbole (`volatility` : `null` sans historique). */
export async function getOptionInputs(symbol: string): Promise<OptionInputs> {
    return apiFetch<OptionInputs>(`/market/option-inputs?${new URLSearchParams({ symbol })}`)
}
