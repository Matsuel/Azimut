import { Logger } from "@azimut/utils"
import {
    API_ERROR_CODES,
    type Risk,
    type RiskCompletedPayload,
    type RiskConstraint,
    type RiskConstraintCheck,
    type RiskReading,
    type RiskView,
} from "@azimut/contracts"
import { BadRequestError, ForbiddenError, NotFoundError } from "@azimut/http"
import { COMPARABLE_STATUSES } from "../constants/backtest.constants"
import type { RiskRecord } from "../interfaces/risk.interface"
import RiskRepository, { type IRiskRepository } from "../repositories/risk.repository"

const logger = Logger.here()

/** Vérification d'une limite : respectée si `|measured| ≤ limit` (égalité comprise). */
const check = (limit: number, measured: number): RiskConstraintCheck => ({
    limit,
    status: Math.abs(measured) <= limit ? "RESPECTED" : "VIOLATED",
})

/** Contrainte de drawdown, `null` sans limite saisie ou sans drawdown mesuré (aucun résultat terminé). */
function toConstraint({ result, maxDrawdownLimit, previousMaxDrawdownLimit }: RiskRecord): RiskConstraint | null {
    if (!maxDrawdownLimit || !result?.maxDrawdown) return null
    const measured = result.maxDrawdown.toNumber()
    return {
        measured,
        current: check(maxDrawdownLimit.toNumber(), measured),
        previous: previousMaxDrawdownLimit ? check(previousMaxDrawdownLimit.toNumber(), measured) : null,
    }
}

/** Paire la plus corrélée (hors diagonale) et actif contribuant le plus au risque. */
function toReading({ assets, correlations }: Risk): RiskReading {
    let mostCorrelatedPair: RiskReading["mostCorrelatedPair"] = null
    for (let i = 0; i < assets.length; i++) {
        for (let j = i + 1; j < assets.length; j++) {
            const correlation = correlations[i]![j]!
            if (!mostCorrelatedPair || correlation > mostCorrelatedPair.correlation) {
                mostCorrelatedPair = { first: assets[i]!.symbol, second: assets[j]!.symbol, correlation }
            }
        }
    }
    const top = assets.reduce((best, asset) => (asset.riskContribution > best.riskContribution ? asset : best))
    return { mostCorrelatedPair, topContributor: { symbol: top.symbol, riskContribution: top.riskContribution } }
}

class RiskService {
    repo: IRiskRepository = new RiskRepository()

    /** `risk.completed` : enregistre le risque du résultat de l'exécution (`null` : données insuffisantes). Rejeu ou résultat absent : ignoré. */
    async store({ executionId, risk }: RiskCompletedPayload) {
        const stored = await this.repo.setRisk(executionId, risk, new Date())
        logger.info(stored ? "Risk stored" : "Risk completed event ignored", { executionId })
    }

    /** Risque du dernier résultat terminé d'un backtest, avec sa contrainte de drawdown ; état `UNAVAILABLE` sans risque reçu (D17). */
    async get(backtestId: string, userId: string): Promise<RiskView> {
        return this.toView(this.assertOwner(await this.repo.getByBacktestId(backtestId, COMPARABLE_STATUSES), userId))
    }

    /**
     * Enregistre la limite de drawdown (la précédente devient « Précédente », D12) et réévalue la contrainte à partir du
     * `maxDrawdown` stocké, sans relancer l'engine. Une limite identique à l'actuelle ne change rien.
     * Lève `BadRequestError(BACKTEST_NO_RESULT)` sans résultat terminé.
     */
    async setLimit(backtestId: string, userId: string, limit: number): Promise<RiskView> {
        const record = this.assertOwner(await this.repo.getByBacktestId(backtestId, COMPARABLE_STATUSES), userId)
        if (!record.result) throw new BadRequestError(API_ERROR_CODES.BACKTEST_NO_RESULT, { id: backtestId })

        const current = record.maxDrawdownLimit?.toNumber() ?? null
        if (current !== limit) {
            await this.repo.setMaxDrawdownLimit(backtestId, limit, current)
            return this.get(backtestId, userId)
        }
        return this.toView(record)
    }

    private toView(record: RiskRecord): RiskView {
        const constraint = toConstraint(record)
        const { result } = record
        // Colonne Json : écrite par `risk.completed` sous la forme `Risk`
        const risk = (result?.risk ?? null) as Risk | null
        if (!result?.riskComputedAt) return { state: "UNAVAILABLE", risk: null, reading: null, constraint }
        if (!risk) return { state: "INSUFFICIENT_DATA", risk: null, reading: null, constraint }
        return { state: "COMPUTED", risk, reading: toReading(risk), constraint }
    }

    private assertOwner<T extends Pick<RiskRecord, "userId">>(record: T | null, userId: string): T {
        if (!record) throw new NotFoundError(API_ERROR_CODES.BACKTEST_NOT_FOUND)
        if (record.userId !== userId) throw new ForbiddenError()
        return record
    }
}

export default RiskService
