import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getRisk, setRiskLimit } from "./api"
import type { RiskView } from "./types"

/**
 * Risque du dernier résultat terminé d'un backtest (clé `["risk", "detail", id]`), sans requête sans `backtestId`.
 * `pollMs(view)` : intervalle de rafraîchissement en ms, ou `false` ; sert à attendre `risk.completed` après une exécution.
 */
export function useRisk(backtestId: string, pollMs: (view: RiskView) => number | false) {
    return useQuery({
        queryKey: ["risk", "detail", backtestId],
        queryFn: backtestId ? () => getRisk(backtestId) : skipToken,
        refetchInterval: (query) => (query.state.data ? pollMs(query.state.data) : false),
    })
}

/** Enregistre la limite de drawdown ; la vue renvoyée remplace celle en cache (contrainte réévaluée par le backend). */
export function useSetRiskLimit(backtestId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (maxDrawdownLimit: number) => setRiskLimit(backtestId, maxDrawdownLimit),
        onSuccess: (view) => queryClient.setQueryData(["risk", "detail", backtestId], view),
    })
}
