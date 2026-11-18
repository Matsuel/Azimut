import { expect, test } from "bun:test"
import { BACKTEST_TOPICS, type BacktestRequestedPayload } from "@azimut/contracts"
import { createKafkaEvent, type KafkaProducer } from "@azimut/kafka"
import BacktestConsumer from "../consumers/backtest.consumer"
import BacktestPublisher from "../publishers/backtest.publisher"
import type BacktestService from "../services/backtest.service"

const request: BacktestRequestedPayload = {
    executionId: "e1",
    backtestId: "b1",
    userId: "u1",
    allocations: [{ symbol: "AAA", weight: 1 }],
    startDate: "2024-01-02T00:00:00.000Z",
    endDate: "2024-01-10T00:00:00.000Z",
    investmentMode: "LUMP_SUM",
    initialAmount: 1000,
    recurringAmount: null,
    investmentFrequency: null,
    rebalanceFrequency: "NONE",
    feeRate: 0,
    benchmarkSymbol: null,
}
const context = { topic: BACKTEST_TOPICS.requested, partition: 0, offset: "0" } as never

function consumerWithRuns() {
    const runs: BacktestRequestedPayload[] = []
    const consumer = new BacktestConsumer({ run: async (payload: BacktestRequestedPayload) => void runs.push(payload) } as unknown as BacktestService)
    return { consumer, runs }
}

test("backtest.requested valide : lance le calcul avec le payload", async () => {
    const { consumer, runs } = consumerWithRuns()

    await consumer.handle(createKafkaEvent(BACKTEST_TOPICS.requested, request), context)

    expect(runs).toEqual([request])
})

test("message invalide : ignoré sans lever ni calculer", async () => {
    const { consumer, runs } = consumerWithRuns()

    await consumer.handle({ nonsense: true }, context)
    await consumer.handle(createKafkaEvent(BACKTEST_TOPICS.requested, { ...request, allocations: [] }), context)

    expect(runs).toEqual([])
})

test("publisher : chaque événement part sur son topic, clé executionId, dans l'enveloppe KafkaEvent", async () => {
    const sent: { topic: string; key?: string; value: { eventType: string; payload: unknown } }[] = []
    const producer = { publish: async (topic: string, message: never) => void sent.push({ topic, ...(message as object) } as never) } as unknown as KafkaProducer
    const publisher = new BacktestPublisher(producer)

    await publisher.started({ executionId: "e1", startedAt: "2024-01-02T00:00:00.000Z" } as never)
    await publisher.failed({ executionId: "e2" } as never)

    expect(sent.map(({ topic, key, value }) => [topic, key, value.eventType])).toEqual([
        [BACKTEST_TOPICS.started, "e1", BACKTEST_TOPICS.started],
        [BACKTEST_TOPICS.failed, "e2", BACKTEST_TOPICS.failed],
    ])
    expect(sent[0]!.value.payload).toMatchObject({ executionId: "e1" })
})
