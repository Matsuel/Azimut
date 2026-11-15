import { afterAll, expect, spyOn, test } from "bun:test"
import type { MessageHandler } from "@azimut/kafka"

const calls: unknown[] = []

const { default: RiskService } = await import("../services/risk.service")
const spy = spyOn(RiskService.prototype, "store").mockImplementation(async (payload) => void calls.push(payload))

// Les espions sont globaux au process : rendus aux autres fichiers de test
afterAll(() => spy.mockRestore())

const { default: RiskConsumer } = await import("../consumers/risk.consumer")

const envelope = (payload: object) => ({ eventId: "ev1", eventType: "risk.completed", occurredAt: "2024-01-01T00:00:00.000Z", version: 1, payload })
const context = { topic: "risk.completed" } as Parameters<MessageHandler<unknown>>[1]

test("risk.completed est routé vers store, risk null compris", async () => {
    calls.length = 0
    const payload = { executionId: "e1", finishedAt: "2024-01-01T00:00:00.000Z", risk: null }

    await new RiskConsumer().handle(envelope(payload), context)

    expect(calls).toEqual([payload])
})

test("un message invalide est ignoré sans exception", async () => {
    calls.length = 0

    await new RiskConsumer().handle({ nonsense: true }, context)

    expect(calls).toEqual([])
})
