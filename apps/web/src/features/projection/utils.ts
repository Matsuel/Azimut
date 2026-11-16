import type { BacktestExecution } from "@/features/backtest/types"
import { isActive } from "@/features/backtest/utils"
import { PROJECTION_POLL_MS, PROJECTION_WAIT_MS } from "./constants"
import type { ProjectionView } from "./types"

/**
 * Intervalle de rafraîchissement de la projection : `PROJECTION_POLL_MS` tant qu'elle manque alors qu'une exécution tourne
 * ou vient de finir (risk-engine la publie après le résultat), `false` sinon (ancien résultat : elle ne viendra pas sans relance).
 */
export function projectionPollMs(view: ProjectionView, execution: BacktestExecution | undefined): number | false {
    if (view.state !== "UNAVAILABLE" || !execution) return false
    if (isActive(execution)) return PROJECTION_POLL_MS
    const finishedAt = execution.finishedAt ? Date.parse(execution.finishedAt) : 0
    return execution.status === "COMPLETED" && Date.now() - finishedAt < PROJECTION_WAIT_MS ? PROJECTION_POLL_MS : false
}
