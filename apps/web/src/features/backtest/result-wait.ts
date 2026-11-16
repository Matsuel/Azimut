import type { ProjectionState, RiskState } from "@azimut/contracts"
import { RESULT_POLL_MS, RESULT_WAIT_MS } from "./constants"
import type { BacktestExecution } from "./types"
import { isActive } from "./utils"

/**
 * Intervalle de rafraîchissement d'un résultat publié après le backtest (risque, projection) : `RESULT_POLL_MS` tant qu'il
 * manque (`state` « UNAVAILABLE », ou « PENDING » : calcul attendu) alors qu'une exécution tourne ou vient de finir, `false`
 * sinon (ancien résultat : il ne viendra pas sans relance ; « PENDING » passé `RESULT_WAIT_MS` : l'écran propose de réessayer).
 */
export function awaitResultPollMs(
    state: RiskState | ProjectionState,
    execution: BacktestExecution | undefined,
): number | false {
    if ((state !== "UNAVAILABLE" && state !== "PENDING") || !execution) return false
    if (isActive(execution)) return RESULT_POLL_MS
    const finishedAt = execution.finishedAt ? Date.parse(execution.finishedAt) : 0
    return execution.status === "COMPLETED" && Date.now() - finishedAt < RESULT_WAIT_MS ? RESULT_POLL_MS : false
}
