import { apiFetch } from "@/lib/api"
import type { PricingInput, PricingView, RateCurve } from "./types"

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
