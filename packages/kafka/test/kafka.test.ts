import { expect, test } from "bun:test"

// Config lue à l'import : variables factices posées avant
process.env.KAFKA_BROKERS = "broker-a:9092, broker-b:9092"
process.env.KAFKA_CLIENT_ID = "kafka-test"
const { createKafkaEvent, kafkaConfig } = await import("../src")

test("createKafkaEvent : enveloppe complète, version 1, identifiant unique", () => {
    const first = createKafkaEvent("risk.completed", { executionId: "e1" })
    const second = createKafkaEvent("risk.completed", { executionId: "e1" })

    expect(first).toMatchObject({ eventType: "risk.completed", version: 1, payload: { executionId: "e1" } })
    expect(Number.isNaN(Date.parse(first.occurredAt))).toBe(false)
    expect(first.eventId).not.toBe(second.eventId)
})

test("kafkaConfig : brokers séparés par des virgules, espaces retirés", () => {
    expect(kafkaConfig).toEqual({ brokers: ["broker-a:9092", "broker-b:9092"], clientId: "kafka-test" })
})
