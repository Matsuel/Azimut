import { skipToken, useQuery } from "@tanstack/react-query"
import { getProjection } from "./api"
import { projectionPollMs } from "./utils"

/**
 * Projection du dernier résultat terminé d'un backtest (clé `["projection", "detail", id]`), sans requête sans `backtestId`.
 * Rafraîchie par `projectionPollMs` tant que `projection.completed` est attendu.
 */
export function useProjection(backtestId: string) {
    return useQuery({
        queryKey: ["projection", "detail", backtestId],
        queryFn: backtestId ? () => getProjection(backtestId) : skipToken,
        refetchInterval: (q) => (q.state.data ? projectionPollMs(q.state.data) : false),
    })
}
