import type { PricingInput, PricingResult } from "@azimut/contracts"
import { prisma } from "../prisma"
import type { PricingRecord } from "../interfaces/pricing.interface"

export interface IPricingRepository {
    create(userId: string, input: PricingInput): Promise<PricingRecord>
    getById(id: string): Promise<PricingRecord | null>
    complete(id: string, result: PricingResult, finishedAt: Date): Promise<boolean>
    fail(id: string, error: string, finishedAt: Date): Promise<boolean>
}

class PricingRepository implements IPricingRepository {
    async create(userId: string, input: PricingInput): Promise<PricingRecord> {
        return prisma.pricingRequest.create({ data: { userId, kind: input.kind, input } })
    }

    async getById(id: string): Promise<PricingRecord | null> {
        return prisma.pricingRequest.findUnique({ where: { id } })
    }

    // Transition gardée : seule une demande PENDING change ; 0 ligne = rejeu ou message tardif
    async complete(id: string, result: PricingResult, finishedAt: Date): Promise<boolean> {
        const { count } = await prisma.pricingRequest.updateMany({
            where: { id, status: "PENDING" },
            data: { status: "COMPLETED", result, finishedAt },
        })
        return count > 0
    }

    async fail(id: string, error: string, finishedAt: Date): Promise<boolean> {
        const { count } = await prisma.pricingRequest.updateMany({
            where: { id, status: "PENDING" },
            data: { status: "FAILED", error, finishedAt },
        })
        return count > 0
    }
}

export default PricingRepository
