// Un résultat sans `projection.completed` reçu depuis plus longtemps passe UNAVAILABLE : risk-engine a planté, le message ne viendra jamais
export const PROJECTION_TIMEOUT_MS = 10 * 60_000
