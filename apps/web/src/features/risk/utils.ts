import type { RiskState } from "@azimut/contracts"
import { RESULT_POLL_MS } from "@/features/backtest/constants"
import type { BacktestExecution } from "@/features/backtest/types"
import { isActive } from "@/features/backtest/utils"
import { RESULT_WAIT_MS } from "./constants"

/**
 * Intervalle de rafraîchissement du risque (ms) : `RESULT_POLL_MS` tant qu'il manque (`state` « UNAVAILABLE ») alors qu'une
 * exécution tourne ou s'est terminée depuis moins de `RESULT_WAIT_MS`, `false` sinon (ancien résultat : il ne viendra pas
 * sans relance ; « UNAVAILABLE » est ambigu et le serveur n'expire pas l'attente du risque).
 */
export function awaitResultPollMs(state: RiskState, execution: BacktestExecution | undefined): number | false {
    if (state !== "UNAVAILABLE" || !execution) return false
    if (isActive(execution)) return RESULT_POLL_MS
    const finishedAt = execution.finishedAt ? Date.parse(execution.finishedAt) : 0
    return execution.status === "COMPLETED" && Date.now() - finishedAt < RESULT_WAIT_MS ? RESULT_POLL_MS : false
}
