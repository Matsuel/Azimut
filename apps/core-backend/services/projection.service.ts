import { Logger } from "@azimut/utils"
import { API_ERROR_CODES, type Projection, type ProjectionCompletedPayload, type ProjectionRun, type ProjectionState, type ProjectionView } from "@azimut/contracts"
import { ForbiddenError, NotFoundError } from "@azimut/http"
import { COMPARABLE_STATUSES } from "../constants/backtest.constants"
import { PROJECTION_TIMEOUT_MS } from "../constants/projection.constants"
import type { ProjectionRecord, ProjectionStatus } from "../interfaces/projection.interface"
import { publishNotification } from "./notification.publisher"
import ProjectionRepository, { type IProjectionRepository } from "../repositories/projection.repository"

const logger = Logger.here()

class ProjectionService {
    repo: IProjectionRepository = new ProjectionRepository()
    // Horloge injectable pour tester l'expiration
    now: () => Date = () => new Date()
    // Publication de `notification.requested` (substituable en test)
    notify = publishNotification

    /**
     * `projection.completed` : enregistre la projection du résultat de l'exécution (`null` : historique insuffisant, moins de 2 jours communs). Rejeu ou résultat absent : ignoré.
     * Publie `PROJECTION_COMPLETED` à la première réception d'une projection non nulle (D5).
     */
    async store({ executionId, finishedAt, projection, durationMs }: ProjectionCompletedPayload) {
        const stored = await this.repo.setProjection(executionId, projection, new Date(), durationMs ?? null)
        logger.info(stored ? "Projection stored" : "Projection completed event ignored", { executionId })
        const horizon = projection?.years.at(-1)
        if (!stored || !projection || !horizon) return
        const backtest = await this.repo.getExecutionBacktest(executionId)
        if (!backtest) return
        await this.notify({
            userId: backtest.userId,
            type: "PROJECTION_COMPLETED",
            dedupKey: `PROJECTION_COMPLETED:${executionId}`,
            occurredAt: finishedAt,
            params: { backtestId: backtest.id, name: backtest.name, scenarios: projection.paths, lossProbability: horizon.lossProbability },
        })
    }

    /** Projection du dernier résultat terminé d'un backtest ; état `PENDING` tant que `projection.completed` attendu n'est pas reçu, `UNAVAILABLE` pour un ancien résultat, sans résultat terminé, ou si l'attente dépasse `PROJECTION_TIMEOUT_MS`. */
    async get(backtestId: string, userId: string): Promise<ProjectionView> {
        const record = await this.repo.getByBacktestId(backtestId, COMPARABLE_STATUSES)
        if (!record) throw new NotFoundError(API_ERROR_CODES.BACKTEST_NOT_FOUND)
        if (record.userId !== userId) throw new ForbiddenError()
        return this.toView(record)
    }

    /** État de la projection d'un résultat : reçue, reçue sans projection (historique insuffisant), attendue (PENDING) ou absente (ancien résultat, ou attente expirée : risk-engine n'a jamais répondu). */
    private stateOf({ createdAt, projectionComputedAt, projectionExpected, hasProjection }: Pick<ProjectionStatus, "createdAt" | "projectionComputedAt" | "projectionExpected" | "hasProjection">): ProjectionState {
        if (!projectionComputedAt) {
            if (!projectionExpected) return "UNAVAILABLE"
            return this.now().getTime() - createdAt.getTime() > PROJECTION_TIMEOUT_MS ? "UNAVAILABLE" : "PENDING"
        }
        return hasProjection ? "COMPUTED" : "INSUFFICIENT_DATA"
    }

    private toView({ result, runs }: ProjectionRecord): ProjectionView {
        // Colonne Json : écrite par `projection.completed` sous la forme `Projection`
        const projection = (result?.projection ?? null) as Projection | null
        const state = result ? this.stateOf({ ...result, hasProjection: projection !== null }) : "UNAVAILABLE"
        // Sans résultat, l'exécution tourne encore : son calcul est attendu
        const history = runs.map(({ id, attempt, result: run }): ProjectionRun => ({
            executionId: id,
            attempt,
            computedAt: run?.projectionComputedAt?.toISOString() ?? null,
            durationMs: run?.projectionDurationMs ?? null,
            state: run ? this.stateOf(run) : "PENDING",
        }))
        return { state, projection: state === "COMPUTED" ? projection : null, history }
    }
}

export default ProjectionService
