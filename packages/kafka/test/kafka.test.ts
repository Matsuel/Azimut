import { expect, test } from "bun:test"
import { CompressionTypes, type Producer } from "kafkajs"

// Config lue à l'import : variables factices posées avant
process.env.KAFKA_BROKERS = "broker-a:9092, broker-b:9092"
process.env.KAFKA_CLIENT_ID = "kafka-test"
const { createKafkaEvent, kafkaConfig, KafkaClient, KafkaProducer } = await import("../src")

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

test("KafkaProducer.publish : un message compressé en gzip, valeur sérialisée en JSON, clé et en-têtes conservés", async () => {
    const sent: unknown[] = []
    const producer = new KafkaProducer({ send: async (record: unknown) => void sent.push(record) } as unknown as Producer)

    await producer.publish("backtest.requested", { key: "e1", value: { a: 1 }, headers: { h: "v" } })

    expect(sent).toEqual([
        { topic: "backtest.requested", compression: CompressionTypes.GZIP, messages: [{ key: "e1", value: '{"a":1}', headers: { h: "v" } }] },
    ])
})

test("KafkaClient.ensureTopics : crée seulement les topics absents et se déconnecte même en erreur", async () => {
    const calls: string[] = []
    let fail = false
    const admin = {
        connect: async () => void calls.push("connect"),
        disconnect: async () => void calls.push("disconnect"),
        listTopics: async () => ["a"],
        createTopics: async ({ topics }: { topics: { topic: string }[] }) => {
            calls.push(`create:${topics.map(({ topic }) => topic).join(",")}`)
            if (fail) throw new Error("broker down")
        },
    }
    const client = new KafkaClient()
    ;(client as unknown as { kafka: { admin: () => typeof admin } }).kafka = { admin: () => admin }

    await client.ensureTopics(["a"])
    await client.ensureTopics(["a", "b"])
    fail = true
    await expect(client.ensureTopics(["c"])).rejects.toThrow("broker down")

    expect(calls).toEqual(["connect", "disconnect", "connect", "create:b", "disconnect", "connect", "create:c", "disconnect"])
})
