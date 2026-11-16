import { skipToken, useQuery } from "@tanstack/react-query"
import { getProjection } from "./api"
import type { ProjectionView } from "./types"

/**
 * Projection du dernier résultat terminé d'un backtest (clé `["projection", "detail", id]`), sans requête sans `backtestId`.
 * `pollMs(view)` : intervalle de rafraîchissement en ms, ou `false` ; sert à attendre `projection.completed` après une exécution.
 */
export function useProjection(backtestId: string, pollMs: (view: ProjectionView) => number | false) {
    return useQuery({
        queryKey: ["projection", "detail", backtestId],
        queryFn: backtestId ? () => getProjection(backtestId) : skipToken,
        refetchInterval: (q) => (q.state.data ? pollMs(q.state.data) : false),
        // La dernière relecture de l'attente (qui arrête le rafraîchissement) doit redessiner l'écran, même sans changement de
        // données : « en cours » passe à « prend plus de temps »
        notifyOnChangeProps: "all",
    })
}
