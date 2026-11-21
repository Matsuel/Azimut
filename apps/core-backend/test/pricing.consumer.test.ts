import { afterAll, afterEach, expect, spyOn, test } from "bun:test"
import { PRICING_TOPICS } from "@azimut/contracts"
import PricingConsumer from "../consumers/pricing.consumer"
import PricingService from "../services/pricing.service"
import { pricingResult } from "./pricing.fixture"

const complete = spyOn(PricingService.prototype, "complete").mockResolvedValue()
const fail = spyOn(PricingService.prototype, "fail").mockResolvedValue()
afterAll(() => {
    complete.mockRestore()
    fail.mockRestore()
})
afterEach(() => {
    complete.mockClear()
    fail.mockClear()
})

const event = (eventType: string, payload: unknown) => ({ eventId: "e1", eventType, occurredAt: "2026-11-20T10:00:01.000Z", version: 1, payload })
const context = (topic: string) => ({ topic, partition: 0, offset: "0" }) as never
const finishedAt = "2026-11-20T10:00:01.000Z"

test("pricing.completed valide : le service complète la demande", async () => {
    await new PricingConsumer().handle(event(PRICING_TOPICS.completed, { requestId: "p1", finishedAt, result: pricingResult }), context(PRICING_TOPICS.completed))

    expect(complete).toHaveBeenCalledTimes(1)
    expect(fail).not.toHaveBeenCalled()
})

test("pricing.failed valide : le service fait échouer la demande", async () => {
    await new PricingConsumer().handle(event(PRICING_TOPICS.failed, { requestId: "p1", finishedAt, reason: "boom" }), context(PRICING_TOPICS.failed))

    expect(fail).toHaveBeenCalledTimes(1)
})

test("message invalide : ignoré sans lever", async () => {
    await new PricingConsumer().handle({ nope: true }, context(PRICING_TOPICS.completed))
    await new PricingConsumer().handle(event(PRICING_TOPICS.failed, { requestId: "" }), context(PRICING_TOPICS.failed))

    expect(complete).not.toHaveBeenCalled()
    expect(fail).not.toHaveBeenCalled()
})
