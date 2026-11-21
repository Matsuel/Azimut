import { createKafkaEvent } from "@azimut/kafka"
import { Logger } from "@azimut/utils"
import {
    API_ERROR_CODES,
    PRICING_TOPICS,
    type PricingCompletedPayload,
    type PricingFailedPayload,
    type PricingInput,
    type PricingRequestedPayload,
    type PricingResult,
    type PricingView,
} from "@azimut/contracts"
import { ForbiddenError, InternalError, NotFoundError } from "@azimut/http"
import { PRICING_TIMEOUT_MS, PRICING_TIMEOUT_REASON } from "../constants/pricing.constants"
import type { PricingRecord } from "../interfaces/pricing.interface"
import PricingRepository, { type IPricingRepository } from "../repositories/pricing.repository"
import { producer } from "../lib/kafka"

const logger = Logger.here()

class PricingService {
    repo: IPricingRepository = new PricingRepository()
    // Horloge injectable pour tester l'expiration
    now: () => Date = () => new Date()
    // Publication de `pricing.requested` (substituable en test)
    publish = (payload: PricingRequestedPayload) =>
        producer.publish(PRICING_TOPICS.requested, { key: payload.requestId, value: createKafkaEvent(PRICING_TOPICS.requested, payload) })

    /**
     * Crée la demande `PENDING` puis publie `pricing.requested` ; le résultat arrive par `pricing.completed` ou `pricing.failed`.
     * Si la publication échoue, la demande passe `FAILED` et `PRICING_QUEUE_FAILED` est levée.
     */
    async create(userId: string, input: PricingInput): Promise<PricingView> {
        const record = await this.repo.create(userId, input)
        try {
            await this.publish({ requestId: record.id, ...input })
            logger.info("Pricing requested", { requestId: record.id, kind: input.kind })
        } catch (error) {
            logger.error("Failed to publish pricing request", { requestId: record.id, error })
            await this.repo.fail(record.id, "Pricing could not be queued", new Date())
            throw new InternalError(API_ERROR_CODES.PRICING_QUEUE_FAILED)
        }
        return this.toView(record)
    }

    /**
     * Demande de pricing de l'utilisateur : `NotFoundError` si elle n'existe pas, `ForbiddenError` si elle appartient à un autre.
     * Une demande `PENDING` depuis plus de `PRICING_TIMEOUT_MS` passe `FAILED` (transition gardée : un résultat arrivé entre-temps gagne).
     */
    async get(id: string, userId: string): Promise<PricingView> {
        let record = await this.repo.getById(id)
        if (!record) throw new NotFoundError(API_ERROR_CODES.PRICING_NOT_FOUND)
        if (record.userId !== userId) throw new ForbiddenError()
        if (record.status === "PENDING" && this.now().getTime() - record.createdAt.getTime() > PRICING_TIMEOUT_MS) {
            await this.repo.fail(id, PRICING_TIMEOUT_REASON, this.now())
            record = (await this.repo.getById(id)) ?? record
        }
        return this.toView(record)
    }

    /** `pricing.completed` : `PENDING` → `COMPLETED` avec le résultat. Rejeu ou demande inconnue : ignoré. */
    async complete({ requestId, finishedAt, result }: PricingCompletedPayload) {
        const done = await this.repo.complete(requestId, result, new Date(finishedAt))
        logger.info(done ? "Pricing completed" : "Pricing completed event ignored", { requestId })
    }

    /** `pricing.failed` : `PENDING` → `FAILED` avec la cause. Rejeu ou demande inconnue : ignoré. */
    async fail({ requestId, finishedAt, reason }: PricingFailedPayload) {
        const done = await this.repo.fail(requestId, reason, new Date(finishedAt))
        logger.info(done ? "Pricing failed" : "Pricing failed event ignored", { requestId, reason })
    }

    private toView(record: PricingRecord): PricingView {
        return {
            id: record.id,
            kind: record.kind,
            status: record.status,
            // Colonnes Json écrites sous la forme du contrat
            input: record.input as PricingInput,
            result: record.status === "COMPLETED" ? (record.result as PricingResult) : null,
            error: record.status === "FAILED" ? record.error : null,
            createdAt: record.createdAt.toISOString(),
        }
    }
}

export default PricingService
