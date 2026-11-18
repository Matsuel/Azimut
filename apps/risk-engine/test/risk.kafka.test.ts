import { afterEach, expect, spyOn, test } from "bun:test"
import { BACKTEST_TOPICS, PROJECTION_TOPICS, RISK_TOPICS, backtestCompletedEventSchema } from "@azimut/contracts"
import { createKafkaEvent, type KafkaProducer } from "@azimut/kafka"
import RiskConsumer from "../consumers/risk.consumer"
import RiskPublisher from "../publishers/risk.publisher"
import type RiskService from "../services/risk.service"

const context = { topic: BACKTEST_TOPICS.completed, partition: 0, offset: "0" } as never
const spies: ReturnType<typeof spyOn>[] = []
afterEach(() => spies.splice(0).forEach((spy) => spy.mockRestore()))

function consumerWithComputes() {
    const computed: unknown[] = []
    const consumer = new RiskConsumer({ compute: async (payload: unknown) => void computed.push(payload) } as unknown as RiskService)
    return { consumer, computed }
}

test("backtest.completed invalide : ignoré sans lever ni calculer", async () => {
    const { consumer, computed } = consumerWithComputes()

    await consumer.handle({ nonsense: true }, context)
    await consumer.handle(createKafkaEvent(BACKTEST_TOPICS.completed, { executionId: "e1" }), context)

    expect(computed).toEqual([])
})

test("backtest.completed conforme au contrat : calcule le risque sur son payload", async () => {
    // Le payload complet est validé par le test du contrat : ici seul le câblage message → service compte
    const event = createKafkaEvent(BACKTEST_TOPICS.completed, { executionId: "e1" })
    spies.push(spyOn(backtestCompletedEventSchema, "safeParse").mockReturnValue({ success: true, data: event } as never))
    const { consumer, computed } = consumerWithComputes()

    await consumer.handle(event, context)

    expect(computed).toEqual([{ executionId: "e1" }])
})

test("publisher : risque et projection sur leur topic, clé executionId", async () => {
    const sent: [string, string | undefined, string][] = []
    const producer = {
        publish: async (topic: string, message: { key?: string; value: { eventType: string } }) => void sent.push([topic, message.key, message.value.eventType]),
    } as unknown as KafkaProducer
    const publisher = new RiskPublisher(producer)

    await publisher.completed({ executionId: "e1" } as never)
    await publisher.projectionCompleted({ executionId: "e1" } as never)

    expect(sent).toEqual([
        [RISK_TOPICS.completed, "e1", RISK_TOPICS.completed],
        [PROJECTION_TOPICS.completed, "e1", PROJECTION_TOPICS.completed],
    ])
})
