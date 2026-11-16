import type { BacktestExecution } from "@/features/backtest/types"
import { isActive } from "@/features/backtest/utils"
import { RISK_POLL_MS, RISK_WAIT_MS } from "./constants"
import type { RiskView } from "./types"

/**
 * Intervalle de rafraîchissement du risque : `RISK_POLL_MS` tant que le risque manque alors qu'une exécution tourne ou vient
 * de finir (risk-engine le publie après le résultat), `false` sinon (ancien résultat : il ne viendra pas sans relance).
 */
export function riskPollMs(view: RiskView, execution: BacktestExecution | undefined): number | false {
    if (view.state !== "UNAVAILABLE" || !execution) return false
    if (isActive(execution)) return RISK_POLL_MS
    const finishedAt = execution.finishedAt ? Date.parse(execution.finishedAt) : 0
    return execution.status === "COMPLETED" && Date.now() - finishedAt < RISK_WAIT_MS ? RISK_POLL_MS : false
}
