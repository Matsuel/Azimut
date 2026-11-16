// Options proposées à l'affichage, en années, bornées par `PROJECTION_PARAMS.horizonYears` (le calcul couvre 30 ans) ;
// l'écran n'affiche que celles présentes dans `projection.years` (une projection plus ancienne couvre 10 ans)
export const HORIZON_YEARS = [1, 3, 5, 10, 20, 30] as const

export const DEFAULT_PROJECTION_HORIZON = 5
