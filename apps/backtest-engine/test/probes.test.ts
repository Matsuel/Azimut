import { expect, test } from "bun:test"
import { runReadiness } from "@azimut/http"
import { kafkaProbeChecks } from "../probes"

function fakeClient(ready: boolean) {
    const client = { ready, isReady: () => client.ready }
    return client
}

test("kafkaProbeChecks : un seul contrôle kafka, prêt seulement si consumer et producer le sont", async () => {
    const consumer = fakeClient(false)
    const producer = fakeClient(false)
    const [kafka, ...rest] = kafkaProbeChecks(consumer, producer)

    expect(kafka?.name).toBe("kafka")
    expect(rest).toEqual([])
    expect(await kafka!.check()).toBe(false)

    consumer.ready = true
    expect(await kafka!.check()).toBe(false)

    consumer.ready = false
    producer.ready = true
    expect(await kafka!.check()).toBe(false)

    consumer.ready = true
    expect(await kafka!.check()).toBe(true)
})

test("kafkaProbeChecks : la readiness suit l'état courant des clients (503 puis 200)", async () => {
    const consumer = fakeClient(false)
    const checks = kafkaProbeChecks(consumer, fakeClient(true))

    expect(await runReadiness(checks)).toEqual({ httpStatus: 503, body: { status: "unavailable", checks: { kafka: "down" } } })

    consumer.ready = true
    expect(await runReadiness(checks)).toEqual({ httpStatus: 200, body: { status: "ok", checks: { kafka: "ok" } } })
})
