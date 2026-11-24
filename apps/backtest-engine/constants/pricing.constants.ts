// Échéances du smile (19, D4) : les plus proches à au moins ce nombre de jours (une échéance de quelques jours n'a pas de smile exploitable)
export const SMILE_MIN_DAYS = 14;

// Volatilité historique de la chaîne : 30 jours de bourse, soit 31 clôtures ; fenêtre de lecture en jours calendaires (week-ends et fériés compris)
export const HISTORICAL_VOLATILITY_DAYS = 30;
export const HISTORICAL_VOLATILITY_LOOKBACK_DAYS = 60;
