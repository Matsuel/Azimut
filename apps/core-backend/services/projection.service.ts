import { Logger } from "@azimut/utils"
import { API_ERROR_CODES, type Projection, type ProjectionCompletedPayload, type ProjectionRun, type ProjectionState, type ProjectionView } from "@azimut/contracts"
import { ForbiddenError, NotFoundError } from "@azimut/http"
import { COMPARABLE_STATUSES } from "../constants/backtest.constants"
import type { ProjectionRecord, ProjectionStatus } from "../interfaces/projection.interface"
import ProjectionRepository, { type IProjectionRepository } from "../repositories/projection.repository"

const logger = Logger.here()

class ProjectionService {
    repo: IProjectionRepository = new ProjectionRepository()

    /** `projection.completed` : enregistre la projection du résultat de l'exécution (`null` : historique insuffisant, moins de 2 jours communs). Rejeu ou résultat absent : ignoré. */
    async store({ executionId, projection, durationMs }: ProjectionCompletedPayload) {
        const stored = await this.repo.setProjection(executionId, projection, new Date(), durationMs)
        logger.info(stored ? "Projection stored" : "Projection completed event ignored", { executionId })
    }

    /** Projection du dernier résultat terminé d'un backtest ; état `PENDING` tant que `projection.completed` attendu n'est pas reçu, `UNAVAILABLE` pour un ancien résultat ou sans résultat terminé. */
    async get(backtestId: string, userId: string): Promise<ProjectionView> {
        const record = await this.repo.getByBacktestId(backtestId, COMPARABLE_STATUSES)
        if (!record) throw new NotFoundError(API_ERROR_CODES.BACKTEST_NOT_FOUND)
        if (record.userId !== userId) throw new ForbiddenError()
        return this.toView(record)
    }

    /** État de la projection d'un résultat : reçue, reçue sans projection (historique insuffisant), attendue (PENDING) ou absente (ancien résultat). */
    private stateOf({ projectionComputedAt, projectionExpected, hasProjection }: Pick<ProjectionStatus, "projectionComputedAt" | "projectionExpected" | "hasProjection">): ProjectionState {
        if (!projectionComputedAt) return projectionExpected ? "PENDING" : "UNAVAILABLE"
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
