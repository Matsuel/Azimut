import type { Backtest, BacktestResult } from "../generated/prisma/client"

// Ce que la route projection lit d'un backtest : propriétaire et projection du résultat terminé le plus récent (null sans résultat)
export type ProjectionRecord = Pick<Backtest, "userId"> & {
    result: Pick<BacktestResult, "projection" | "projectionComputedAt"> | null
}
