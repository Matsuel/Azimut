import type { MONITORED_SERVICES } from "@azimut/contracts"
import type { ProbeChecks, ServiceState } from "./types"

// Rafraîchissement automatique de la page, en millisecondes (maquette : « toutes les 15 s »)
export const MONITORING_REFRESH_MS = 15_000

// Cartes de service affichées pendant le chargement : une par service surveillé. Pas d'import runtime du contrat
// dans le web : `satisfies` fait échouer tsc si `MONITORED_SERVICES` change de longueur
export const MONITORED_SERVICE_COUNT = 5 satisfies (typeof MONITORED_SERVICES)["length"]

// Badge de l'état calculé par core-backend ; libellé `monitoring.states.<état>`
export const stateBadges = {
    up: "success",
    degraded: "secondary",
    down: "destructive",
} as const satisfies Record<ServiceState, "success" | "secondary" | "destructive">

// Ordre d'affichage des dépendances d'une carte ; libellé `monitoring.checks.<clé>`
export const CHECK_KEYS = ["database", "kafka", "provider"] as const satisfies readonly (keyof ProbeChecks)[]
