import { z } from "zod";

// Services sondés par la page Monitoring, dans l'ordre d'affichage du tableau
export const MONITORED_SERVICES = [
    "core-backend",
    "market-service",
    "notification-service",
    "backtest-engine",
    "risk-engine",
] as const;

export type MonitoredService = (typeof MONITORED_SERVICES)[number];

export const dependencyStatusSchema = z.enum(["ok", "down"]);

// Dépendances vérifiées par `/readiness` (D3) : chaque service ne renseigne que les siennes ;
// `provider` = fournisseur de cours Yahoo, propre à market-service
export const probeChecksSchema = z.object({
    database: dependencyStatusSchema.optional(),
    kafka: dependencyStatusSchema.optional(),
    provider: dependencyStatusSchema.optional(),
});

/** `GET /liveness` : le processus tourne ; ne touche aucune dépendance (D2). */
export const livenessResponseSchema = z.object({
    status: z.literal("ok"),
});

/** `GET /readiness` : `ok` en 200, `unavailable` en 503 dès qu'une dépendance est `down` (D2). */
export const readinessResponseSchema = z.object({
    status: z.enum(["ok", "unavailable"]),
    checks: probeChecksSchema,
});

// État d'un service calculé par core-backend (D6) : up = 200, degraded = 503, down = délai dépassé ou injoignable
export const serviceStateSchema = z.enum(["up", "degraded", "down"]);

export const serviceStatusSchema = z.object({
    service: z.enum(MONITORED_SERVICES),
    state: serviceStateSchema,
    // Absent quand le service est down : aucune réponse à lire
    checks: probeChecksSchema.optional(),
    // Millisecondes : durée de l'appel à `/readiness` ; null quand le service est down
    latencyMs: z.number().min(0).nullable(),
    // Date ISO 8601 du contrôle
    checkedAt: z.iso.datetime(),
});

/** Réponse de `GET /api/admin/monitoring/services` : lignes du tableau et synthèse calculée par core-backend (D9). */
export const monitoringServicesResponseSchema = z.object({
    services: z.array(serviceStatusSchema),
    summary: z.object({
        // Entiers ≥ 0 : nombre de services, au total puis par état
        total: z.number().int().min(0),
        up: z.number().int().min(0),
        degraded: z.number().int().min(0),
        down: z.number().int().min(0),
        // Services down, dans l'ordre de MONITORED_SERVICES
        downServices: z.array(z.enum(MONITORED_SERVICES)),
    }),
});

export type DependencyStatus = z.infer<typeof dependencyStatusSchema>;
export type ProbeChecks = z.infer<typeof probeChecksSchema>;
export type LivenessResponse = z.infer<typeof livenessResponseSchema>;
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
export type ServiceState = z.infer<typeof serviceStateSchema>;
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;
export type MonitoringServicesResponse = z.infer<typeof monitoringServicesResponseSchema>;
