// Échéances du smile (19, D4) : les plus proches à au moins ce nombre de jours (une échéance de quelques jours n'a pas de smile exploitable)
export const SMILE_MIN_DAYS = 14;

// Volatilité historique de la chaîne : 30 jours de bourse, soit 31 clôtures ; fenêtre de lecture en jours calendaires (week-ends et fériés compris)
export const HISTORICAL_VOLATILITY_DAYS = 30;
export const HISTORICAL_VOLATILITY_LOOKBACK_DAYS = 60;

// Pricing Monte Carlo (20) : graine fixe, jamais saisie (D4) ; le résultat la publie pour rejouer le calcul
export const MONTE_CARLO_SEED = 42;

// Trajectoires d'illustration publiées avec le résultat (les premières du tirage)
export const MONTE_CARLO_SAMPLE_PATHS = 20;

// Points de la courbe de convergence : parts du nombre de trajectoires (1 %, 5 %, 10 %, 50 %, 100 %)
export const MONTE_CARLO_CONVERGENCE_FRACTIONS = [0.01, 0.05, 0.1, 0.5, 1] as const;

// Validation contre Black-Scholes (D3) : écart toléré en erreurs standard ; prix nul (erreur standard nulle) : écart toléré en devise du sous-jacent
export const MONTE_CARLO_VALIDATION_STD_ERRORS = 3;
export const MONTE_CARLO_ZERO_ERROR_TOLERANCE = 1e-6;

// Produits structurés (21) : marge de structuration conservée par l'émetteur sur un capital garanti, en ratio du nominal (4 % : ordre de grandeur de la rémunération d'un émetteur sur une note à capital garanti, hypothèse de pédagogie) ; le budget d'option est ce qui reste du nominal après le zéro-coupon et cette marge (D2)
export const STRUCTURING_MARGIN = 0.04;

// Autocallable : trajectoires simulées (observation annuelle, un tirage par année : 100 000 × 10 ans reste sous la seconde)
export const AUTOCALL_PATHS = 100_000;

// Grille du payoff à l'échéance : variation du sous-jacent de −50 % à +60 %, par pas de 5 points
export const STRUCTURED_PAYOFF_GRID = { from: -0.5, to: 0.6, step: 0.05 } as const;
