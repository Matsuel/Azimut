// Horizons proposés, en années : copie voulue de `PROJECTION_HORIZONS` (packages/contracts/src/projection.ts), que le web
// ne peut importer qu'en type (zod n'est pas embarqué dans le front)
export const HORIZON_YEARS = [1, 3, 5, 10] as const

export const DEFAULT_PROJECTION_HORIZON = 5
