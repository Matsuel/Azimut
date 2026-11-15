import type { Backtest, BacktestResult } from "../generated/prisma/client"

// Ce que la page Risque lit d'un backtest : limites saisies et résultat terminé le plus récent (null sans résultat)
export type RiskRecord = Pick<Backtest, "userId" | "maxDrawdownLimit" | "previousMaxDrawdownLimit"> & {
    result: Pick<BacktestResult, "risk" | "riskComputedAt" | "maxDrawdown"> | null
}
