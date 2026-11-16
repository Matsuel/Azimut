import type { Backtest, BacktestResult } from "../generated/prisma/client"

// Suivi de la projection d'un résultat ; `hasProjection` : la colonne `projection` n'est pas null (le Json lui-même n'est pas relu)
export type ProjectionStatus = Pick<BacktestResult, "projectionComputedAt" | "projectionExpected" | "projectionDurationMs"> & { hasProjection: boolean }

// Une exécution du backtest ; `result` null = exécution en cours, sans résultat
export type ProjectionRunRecord = { id: string; attempt: number; result: ProjectionStatus | null }

// Ce que la route projection lit d'un backtest : propriétaire, projection du résultat terminé le plus récent (null sans résultat)
// et suivi de la projection de chaque exécution, la plus récente d'abord
export type ProjectionRecord = Pick<Backtest, "userId"> & {
    result: Pick<BacktestResult, "projection" | "projectionComputedAt" | "projectionExpected" | "projectionDurationMs"> | null
    runs: ProjectionRunRecord[]
}
