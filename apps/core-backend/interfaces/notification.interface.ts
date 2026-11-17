import type { Prisma } from "../generated/prisma/client"

// Ce qu'une notification retient du backtest d'une exécution : propriétaire et nom affiché
export const notifiedBacktestSelect = { id: true, userId: true, name: true } satisfies Prisma.BacktestSelect

export type NotifiedBacktest = Prisma.BacktestGetPayload<{ select: typeof notifiedBacktestSelect }>
