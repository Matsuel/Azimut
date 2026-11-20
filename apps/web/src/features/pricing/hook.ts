import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createPricing, getPricing, getRateCurve } from "./api"
import { PRICING_POLL_MS, RATE_CURVE_STALE_MS } from "./constants"

/** Courbe des taux US (clé `["pricing", "rates"]`) : les taux ne bougent qu'en séance, pas de rafraîchissement automatique. */
export function useRateCurve() {
    return useQuery({ queryKey: ["pricing", "rates"], queryFn: getRateCurve, staleTime: RATE_CURVE_STALE_MS })
}

/** Lance un calcul de prix ; la vue `PENDING` renvoyée entre dans le cache de `usePricing` pour qu'elle s'affiche sans attente. */
export function useCreatePricing() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createPricing,
        onSuccess: (view) => queryClient.setQueryData(["pricing", "detail", view.id], view),
    })
}

/** Demande de pricing (clé `["pricing", "detail", id]`), sans requête sans `id` ; rafraîchie tant qu'elle est `PENDING`. */
export function usePricing(id: string | null) {
    return useQuery({
        queryKey: ["pricing", "detail", id],
        queryFn: id ? () => getPricing(id) : skipToken,
        refetchInterval: (query) => (query.state.data?.status === "PENDING" ? PRICING_POLL_MS : false),
    })
}
