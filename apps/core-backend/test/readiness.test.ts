import { describe, expect, test } from "bun:test"
import { runReadiness } from "@azimut/http"
import { readinessChecks } from "../utils/readiness"

const ready = (value: boolean) => ({ isReady: () => value })

describe("readinessChecks", () => {
    test("200 quand la base et tous les clients Kafka sont prêts", async () => {
        const checks = readinessChecks(async () => true, [ready(true), ready(true)])
        const { httpStatus, body } = await runReadiness(checks)
        expect(httpStatus).toBe(200)
        expect(body).toEqual({ status: "ok", checks: { database: "ok", kafka: "ok" } })
    })

    test("kafka down dès qu'un client n'est pas prêt (consumer hors du groupe)", async () => {
        const checks = readinessChecks(async () => true, [ready(true), ready(false)])
        const { httpStatus, body } = await runReadiness(checks)
        expect(httpStatus).toBe(503)
        expect(body.checks).toEqual({ database: "ok", kafka: "down" })
    })

    test("database down quand la base ne répond pas", async () => {
        const checks = readinessChecks(async () => false, [ready(true)])
        const { httpStatus, body } = await runReadiness(checks)
        expect(httpStatus).toBe(503)
        expect(body.checks).toEqual({ database: "down", kafka: "ok" })
    })
})
