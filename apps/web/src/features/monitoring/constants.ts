import type { ProbeChecks, ServiceState } from "./types"

// Rafraîchissement automatique de la page, en millisecondes (maquette : « toutes les 15 s »)
export const MONITORING_REFRESH_MS = 15_000

// Cartes de service affichées pendant le chargement : une par service surveillé (`MONITORED_SERVICES` du contrat,
// non importé : aucun import runtime de @azimut/contracts dans le web)
export const MONITORED_SERVICE_COUNT = 5

// Badge de l'état calculé par core-backend ; libellé `monitoring.states.<état>`
export const stateBadges = {
    up: "success",
    degraded: "secondary",
    down: "destructive",
} as const satisfies Record<ServiceState, "success" | "secondary" | "destructive">

// Ordre d'affichage des dépendances d'une carte ; libellé `monitoring.checks.<clé>`
export const CHECK_KEYS = ["database", "kafka", "provider"] as const satisfies readonly (keyof ProbeChecks)[]
