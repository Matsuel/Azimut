import { Logger } from "@azimut/utils"
import { API_ERROR_CODES, type Projection, type ProjectionCompletedPayload, type ProjectionView } from "@azimut/contracts"
import { ForbiddenError, NotFoundError } from "@azimut/http"
import { COMPARABLE_STATUSES } from "../constants/backtest.constants"
import type { ProjectionRecord } from "../interfaces/projection.interface"
import ProjectionRepository, { type IProjectionRepository } from "../repositories/projection.repository"

const logger = Logger.here()

class ProjectionService {
    repo: IProjectionRepository = new ProjectionRepository()

    /** `projection.completed` : enregistre la projection du résultat de l'exécution (`null` : historique insuffisant, moins de 2 jours communs). Rejeu ou résultat absent : ignoré. */
    async store({ executionId, projection }: ProjectionCompletedPayload) {
        const stored = await this.repo.setProjection(executionId, projection, new Date())
        logger.info(stored ? "Projection stored" : "Projection completed event ignored", { executionId })
    }

    /** Projection du dernier résultat terminé d'un backtest ; état `UNAVAILABLE` sans `projection.completed` reçu. */
    async get(backtestId: string, userId: string): Promise<ProjectionView> {
        const record = await this.repo.getByBacktestId(backtestId, COMPARABLE_STATUSES)
        if (!record) throw new NotFoundError(API_ERROR_CODES.BACKTEST_NOT_FOUND)
        if (record.userId !== userId) throw new ForbiddenError()
        return this.toView(record)
    }

    private toView({ result }: ProjectionRecord): ProjectionView {
        // Colonne Json : écrite par `projection.completed` sous la forme `Projection`
        const projection = (result?.projection ?? null) as Projection | null
        if (!result?.projectionComputedAt) return { state: "UNAVAILABLE", projection: null }
        if (!projection) return { state: "INSUFFICIENT_DATA", projection: null }
        return { state: "COMPUTED", projection }
    }
}

export default ProjectionService
