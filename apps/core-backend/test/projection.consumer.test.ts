import { afterAll, expect, spyOn, test } from "bun:test"
import type { MessageHandler } from "@azimut/kafka"

const calls: unknown[] = []

const { default: ProjectionService } = await import("../services/projection.service")
const spy = spyOn(ProjectionService.prototype, "store").mockImplementation(async (payload) => void calls.push(payload))

// Les espions sont globaux au process : rendus aux autres fichiers de test
afterAll(() => spy.mockRestore())

const { default: ProjectionConsumer } = await import("../consumers/projection.consumer")

const envelope = (payload: object) => ({ eventId: "ev1", eventType: "projection.completed", occurredAt: "2024-01-01T00:00:00.000Z", version: 1, payload })
const context = { topic: "projection.completed" } as Parameters<MessageHandler<unknown>>[1]

test("projection.completed est routé vers store, projection null comprise", async () => {
    calls.length = 0
    const payload = { executionId: "e1", finishedAt: "2024-01-01T00:00:00.000Z", durationMs: 700, projection: null }

    await new ProjectionConsumer().handle(envelope(payload), context)

    expect(calls).toEqual([payload])
})

test("projection.completed sans durationMs (message antérieur à D13) est accepté", async () => {
    calls.length = 0
    const payload = { executionId: "e1", finishedAt: "2024-01-01T00:00:00.000Z", projection: null }

    await new ProjectionConsumer().handle(envelope(payload), context)

    expect(calls).toEqual([payload])
})

test("un message invalide est ignoré sans exception", async () => {
    calls.length = 0

    await new ProjectionConsumer().handle({ nonsense: true }, context)

    expect(calls).toEqual([])
})
