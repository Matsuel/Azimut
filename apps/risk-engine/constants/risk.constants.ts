// Jours de cotation communs minimaux : sous ce seuil, une VaR à 95 % n'a pas de sens (D6)
export const MIN_COMMON_DAYS = 250;

// Niveau de confiance de la VaR et de la CVaR historiques (D1)
export const VAR_CONFIDENCE = 0.95;

// Jours de cotation communs minimaux de la projection : un seul rendement suffit, le résultat est alors peu précis (D12)
export const MIN_PROJECTION_DAYS = 2;
