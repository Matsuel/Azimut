import { expect, test } from "bun:test"
import { PRICING_TOPICS, type PricingRequestedPayload } from "@azimut/contracts"
import { createKafkaEvent, type KafkaProducer } from "@azimut/kafka"
import PricingConsumer from "../consumers/pricing.consumer"
import PricingPublisher from "../publishers/pricing.publisher"
import type PricingService from "../services/pricing.service"

const request: PricingRequestedPayload = {
    requestId: "p1",
    kind: "BOND",
    bond: { nominal: 100, couponRate: 0, maturityYears: 5, discount: { source: "FLAT", rate: 0.03 }, valueDate: "2026-10-28" },
}
const context = { topic: PRICING_TOPICS.requested, partition: 0, offset: "0" } as never

function consumerWithRuns() {
    const runs: PricingRequestedPayload[] = []
    const consumer = new PricingConsumer({ run: async (payload: PricingRequestedPayload) => void runs.push(payload) } as unknown as PricingService)
    return { consumer, runs }
}

test("pricing.requested valide : lance le calcul avec le payload", async () => {
    const { consumer, runs } = consumerWithRuns()

    await consumer.handle(createKafkaEvent(PRICING_TOPICS.requested, request), context)

    expect(runs).toEqual([request])
})

test("message invalide : ignoré sans lever ni calculer", async () => {
    const { consumer, runs } = consumerWithRuns()

    await consumer.handle({ nope: true }, context)
    await consumer.handle(createKafkaEvent(PRICING_TOPICS.requested, { ...request, bond: { ...request.bond, maturityYears: 0 } }), context)

    expect(runs).toEqual([])
})

test("le publisher publie completed et failed avec le requestId pour clé", async () => {
    const sent: { topic: string; key: string; value: { payload: unknown } }[] = []
    const producer = { publish: async (topic: string, message: { key: string; value: { payload: unknown } }) => void sent.push({ topic, ...message }) } as unknown as KafkaProducer
    const publisher = new PricingPublisher(producer)

    await publisher.failed({ requestId: "p1", finishedAt: "2026-11-20T10:00:00.000Z", reason: "boom" })

    expect(sent.map(({ topic, key }) => ({ topic, key }))).toEqual([{ topic: PRICING_TOPICS.failed, key: "p1" }])
    expect(sent[0]!.value.payload).toEqual({ requestId: "p1", finishedAt: "2026-11-20T10:00:00.000Z", reason: "boom" })
})
