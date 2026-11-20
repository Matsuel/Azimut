import { createServer } from "node:http";
import type { Router } from "express";
import type { DependencyStatus, LivenessResponse, ProbeChecks, ReadinessResponse } from "@azimut/contracts";
import { Logger } from "@azimut/utils";

const logger = Logger.here();

/** Une dépendance vérifiée par `/readiness` : `check` renvoie `true` si elle répond. */
export interface ProbeCheck {
    name: keyof ProbeChecks;
    check: () => Promise<boolean> | boolean;
}

export interface ReadinessResult {
    httpStatus: 200 | 503;
    body: ReadinessResponse;
}

/** Client Kafka dont la sonde lit l'état (`KafkaConsumer`, `KafkaProducer` de `@azimut/kafka`). */
export interface ReadyClient {
    isReady(): boolean;
}

const LIVENESS: LivenessResponse = { status: "ok" };

/**
 * Délai d'un contrôle, en millisecondes : une dépendance qui ne répond pas (base injoignable, délai de connexion
 * `pg` infini) passe `down` au lieu de faire pendre la sonde au-delà du délai de 2 s de l'agrégation de core-backend.
 */
export const PROBE_CHECK_TIMEOUT_MS = 1_500;

/** Contrôle `kafka` (D4) : `ok` seulement si tous les clients (consumers et producer) sont prêts, relu à chaque sonde. */
export function kafkaCheck(clients: ReadyClient[]): ProbeCheck {
    return { name: "kafka", check: () => clients.every((client) => client.isReady()) };
}

async function runCheck({ name, check }: ProbeCheck): Promise<DependencyStatus> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<false>((resolve) => {
        timer = setTimeout(() => {
            logger.warn("Readiness check timed out", { check: name, timeoutMs: PROBE_CHECK_TIMEOUT_MS });
            resolve(false);
        }, PROBE_CHECK_TIMEOUT_MS);
    });
    try {
        return (await Promise.race([Promise.resolve(check()), timeout])) ? "ok" : "down";
    } catch (error) {
        // Une sonde ne fait jamais tomber le service : l'exception devient une dépendance `down`
        logger.error("Readiness check failed", { check: name, error: error instanceof Error ? error.message : String(error) });
        return "down";
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Exécute les contrôles en parallèle et construit la réponse de `/readiness` (D2) : `200 ok` si tous répondent,
 * `503 unavailable` dès qu'un contrôle renvoie `false`, lève (jamais propagé) ou dépasse `PROBE_CHECK_TIMEOUT_MS`. Sans contrôle : `200` et `checks: {}`.
 */
export async function runReadiness(checks: ProbeCheck[]): Promise<ReadinessResult> {
    const statuses = await Promise.all(checks.map(runCheck));
    const result: ProbeChecks = {};
    checks.forEach(({ name }, i) => {
        result[name] = statuses[i];
    });
    const ready = statuses.every((status) => status === "ok");
    return { httpStatus: ready ? 200 : 503, body: { status: ready ? "ok" : "unavailable", checks: result } };
}

/** Enregistre `GET /liveness` (toujours 200, aucun contrôle) et `GET /readiness` sur une app ou un routeur Express. */
export function registerProbes(app: Pick<Router, "get">, checks: ProbeCheck[]): void {
    app.get("/liveness", (_req, res) => {
        res.json(LIVENESS);
    });
    app.get("/readiness", async (_req, res) => {
        const { httpStatus, body } = await runReadiness(checks);
        res.status(httpStatus).json(body);
    });
}

/**
 * Serveur `node:http` minimal des workers Kafka sans Express (D5) : `GET /liveness` et `GET /readiness`, 404 sinon.
 * Résout une fois en écoute (port 0 = port libre) ; l'appelant enregistre `close` avec `onShutdown`.
 */
export async function startProbeServer(port: number, checks: ProbeCheck[]): Promise<{ port: number; close: () => Promise<void> }> {
    const server = createServer(async (req, res) => {
        const path = req.url?.split("?")[0];
        const send = (status: number, body: object) => {
            res.writeHead(status, { "content-type": "application/json" });
            res.end(JSON.stringify(body));
        };
        if (req.method === "GET" && path === "/liveness") return send(200, LIVENESS);
        if (req.method === "GET" && path === "/readiness") {
            const { httpStatus, body } = await runReadiness(checks);
            return send(httpStatus, body);
        }
        send(404, { error: "Not found" });
    });

    await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, () => resolve());
    });
    const { port: listening } = server.address() as { port: number };

    return {
        port: listening,
        close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
    };
}
