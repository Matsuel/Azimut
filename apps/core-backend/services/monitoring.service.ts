import { Logger } from "@azimut/utils"
import {
    MONITORED_SERVICES,
    readinessResponseSchema,
    type MonitoredService,
    type MonitoringServicesResponse,
    type ServiceStatus,
} from "@azimut/contracts"
import { runReadiness, type ProbeCheck } from "@azimut/http"
import { MONITORING_PROBE_TIMEOUT_MS } from "../constants/monitoring.constants"
import { CORE_BACKEND_CHECKS } from "../utils/probes"
import { env } from "../env"

const logger = Logger.here()

// Services sondés par HTTP ; core-backend se sonde lui-même sans appel réseau
type RemoteService = Exclude<MonitoredService, "core-backend">

const elapsedMs = (start: number) => Math.round(performance.now() - start)

class MonitoringService {
    // Substituables en test : appel HTTP des sondes, contrôles de core-backend, URL des services distants
    fetch: typeof fetch = fetch
    checks: ProbeCheck[] = CORE_BACKEND_CHECKS
    urls: Record<RemoteService, string> = {
        "market-service": env.MARKET_SERVICE_URL,
        "notification-service": env.NOTIFICATION_SERVICE_URL,
        "backtest-engine": env.BACKTEST_ENGINE_HEALTH_URL,
        "risk-engine": env.RISK_ENGINE_HEALTH_URL,
    }

    /**
     * Sonde les cinq services en parallèle et calcule leur état (D6) et la synthèse (D9), lignes dans l'ordre de
     * `MONITORED_SERVICES`. Ne lève jamais : un service injoignable est une ligne `down`.
     */
    async getServices(): Promise<MonitoringServicesResponse> {
        const services = await Promise.all(MONITORED_SERVICES.map((service) => this.probe(service)))
        const downServices = services.filter(({ state }) => state === "down").map(({ service }) => service)
        const count = (state: ServiceStatus["state"]) => services.filter((status) => status.state === state).length
        logger.info("Services probed", { downServices })
        return {
            services,
            summary: { total: services.length, up: count("up"), degraded: count("degraded"), down: downServices.length, downServices },
        }
    }

    private async probe(service: MonitoredService): Promise<ServiceStatus> {
        const start = performance.now()
        if (service === "core-backend") {
            const { httpStatus, body } = await runReadiness(this.checks)
            return this.toStatus(service, httpStatus, body.checks, elapsedMs(start))
        }
        try {
            const response = await this.fetch(new URL("/readiness", this.urls[service]), {
                signal: AbortSignal.timeout(MONITORING_PROBE_TIMEOUT_MS),
            })
            const latencyMs = elapsedMs(start)
            const parsed = readinessResponseSchema.safeParse(await response.json())
            if (!parsed.success || (response.status !== 200 && response.status !== 503)) {
                logger.warn("Readiness response rejected", { service, status: response.status })
                return this.down(service)
            }
            return this.toStatus(service, response.status, parsed.data.checks, latencyMs)
        } catch (error) {
            // Délai dépassé (`TimeoutError`), connexion refusée ou corps qui n'est pas du JSON
            logger.warn("Readiness probe failed", { service, error: error instanceof Error ? error.name : String(error) })
            return this.down(service)
        }
    }

    // 200 → up, 503 → degraded : le service répond mais une dépendance est KO
    private toStatus(service: MonitoredService, httpStatus: 200 | 503, checks: ServiceStatus["checks"], latencyMs: number): ServiceStatus {
        return { service, state: httpStatus === 200 ? "up" : "degraded", checks, latencyMs, checkedAt: new Date().toISOString() }
    }

    private down(service: MonitoredService): ServiceStatus {
        return { service, state: "down", latencyMs: null, checkedAt: new Date().toISOString() }
    }
}

export default MonitoringService
