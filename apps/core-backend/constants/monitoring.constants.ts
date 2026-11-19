// Délai d'un appel à `/readiness`, en millisecondes : au-delà, le service est `down` (D6) ; les sondes coupent leurs propres contrôles à 1,5 s
export const MONITORING_PROBE_TIMEOUT_MS = 2_000
