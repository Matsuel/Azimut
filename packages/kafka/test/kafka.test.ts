import { expect, test } from "bun:test"
import { CompressionTypes, type Consumer, type Producer } from "kafkajs"

// Config lue à l'import : variables factices posées avant
process.env.KAFKA_BROKERS = "broker-a:9092, broker-b:9092"
process.env.KAFKA_CLIENT_ID = "kafka-test"
const { createKafkaEvent, kafkaConfig, KafkaClient, KafkaConsumer, KafkaProducer } = await import("../src")

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

// Client kafkajs factice : `on` mémorise les écouteurs par événement, `emit` les déclenche
function fakeKafkaClient(events: Record<string, string>) {
    const listeners = new Map<string, (() => void)[]>()
    let connects = 0
    const client = {
        events,
        on: (event: string, listener: () => void) => {
            listeners.set(event, [...(listeners.get(event) ?? []), listener])
            return () => {}
        },
        connect: async () => void connects++,
    }
    const emit = (event: string) => listeners.get(event)?.forEach((listener) => listener())
    return { client, emit, listenerCount: () => [...listeners.values()].flat().length, connects: () => connects }
}

const consumerEvents = { GROUP_JOIN: "consumer.group_join", CRASH: "consumer.crash", STOP: "consumer.stop", DISCONNECT: "consumer.disconnect" }

test("KafkaConsumer.isReady : faux au départ, vrai après la jointure du groupe, faux après crash, stop ou déconnexion", async () => {
    const { client, emit } = fakeKafkaClient(consumerEvents)
    const consumer = new KafkaConsumer(client as unknown as Consumer)

    expect(consumer.isReady()).toBe(false)
    await consumer.connect()
    expect(consumer.isReady()).toBe(false)

    for (const event of [consumerEvents.CRASH, consumerEvents.STOP, consumerEvents.DISCONNECT]) {
        emit(consumerEvents.GROUP_JOIN)
        expect(consumer.isReady()).toBe(true)
        emit(event)
        expect(consumer.isReady()).toBe(false)
    }
})

test("KafkaConsumer.connect rappelé : écouteurs posés une seule fois", async () => {
    const { client, listenerCount, connects } = fakeKafkaClient(consumerEvents)
    const consumer = new KafkaConsumer(client as unknown as Consumer)

    await consumer.connect()
    await consumer.connect()

    expect(listenerCount()).toBe(4)
    expect(connects()).toBe(2)
})

test("KafkaProducer.isReady : faux au départ, vrai après connexion, faux après déconnexion, écouteurs posés une seule fois", async () => {
    const events = { CONNECT: "producer.connect", DISCONNECT: "producer.disconnect" }
    const { client, emit, listenerCount } = fakeKafkaClient(events)
    const producer = new KafkaProducer(client as unknown as Producer)

    expect(producer.isReady()).toBe(false)
    await producer.connect()
    await producer.connect()
    expect(listenerCount()).toBe(2)
    expect(producer.isReady()).toBe(false)

    emit(events.CONNECT)
    expect(producer.isReady()).toBe(true)
    emit(events.DISCONNECT)
    expect(producer.isReady()).toBe(false)
})
