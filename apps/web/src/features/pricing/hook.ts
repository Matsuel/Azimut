import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { createPricing, getOptionInputs, getPricing, getRateCurve } from "./api"
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

/** Valeurs de préremplissage d'un symbole (clé `["pricing", "option-inputs", symbol]`), sans requête sans symbole ; un échec n'est pas relancé : la saisie manuelle prend le relais. */
export function useOptionInputs(symbol: string | null) {
    return useQuery({
        queryKey: ["pricing", "option-inputs", symbol],
        queryFn: symbol ? () => getOptionInputs(symbol) : skipToken,
        retry: false,
    })
}

/**
 * Chaîne d'options d'un symbole : lance `POST /api/pricing` (`OPTION_CHAIN`) à l'ouverture de l'écran, une seule fois même en mode strict,
 * puis lit la demande (`usePricing`). `recompute` relance un calcul ; `result` n'existe qu'une fois la demande `COMPLETED`.
 */
export function useChainPricing(symbol: string | null) {
    const [id, setId] = useState<string | null>(null)
    const create = useCreatePricing()
    const query = usePricing(id)
    const { mutate } = create
    const started = useRef(false)
    const recompute = () => {
        if (symbol) mutate({ kind: "OPTION_CHAIN", chain: { symbol } }, { onSuccess: (view) => setId(view.id) })
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: un seul lancement à l'ouverture
    useEffect(() => {
        if (started.current) return
        started.current = true
        recompute()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const view = query.data
    return {
        view,
        result: view?.status === "COMPLETED" && view.result?.kind === "OPTION_CHAIN" ? view.result.chain : null,
        pending: create.isPending || view?.status === "PENDING",
        readFailed: query.isError,
        createError: create.isError ? create.error : null,
        recompute,
    }
}
