import { expect, test } from "bun:test"
import { ForbiddenError, InternalError, NotFoundError } from "@azimut/http"
import type { PricingRequestedPayload } from "@azimut/contracts"
import type { IPricingRepository } from "../repositories/pricing.repository"
import type { PricingRecord } from "../interfaces/pricing.interface"
import { PRICING_TIMEOUT_MS } from "../constants/pricing.constants"
import PricingService from "../services/pricing.service"
import { optionInput, pricingInput, pricingResult } from "./pricing.fixture"

const record = (over: Partial<PricingRecord> = {}): PricingRecord => ({
    id: "p1",
    userId: "u1",
    kind: "BOND",
    status: "PENDING",
    input: pricingInput as never,
    result: null,
    error: null,
    createdAt: new Date("2026-11-20T10:00:00Z"),
    finishedAt: null,
    ...over,
})

function setup(stored: PricingRecord | null = record(), transition = true) {
    const published: PricingRequestedPayload[] = []
    const calls: string[] = []
    const service = new PricingService()
    service.publish = async (payload) => void published.push(payload)
    service.repo = {
        create: async () => record(),
        getById: async () => stored,
        complete: async () => (calls.push("complete"), transition),
        fail: async (_id: string, error: string) => (calls.push(`fail:${error}`), transition),
    } as IPricingRepository
    return { service, published, calls }
}

test("create : demande PENDING et pricing.requested publié avec l'id de la demande", async () => {
    const { service, published } = setup()

    const view = await service.create("u1", pricingInput)

    expect(view).toMatchObject({ id: "p1", status: "PENDING", result: null, error: null, input: pricingInput })
    expect(published).toEqual([{ requestId: "p1", ...pricingInput }])
})

test("create : publication en échec → demande FAILED et PRICING_QUEUE_FAILED", async () => {
    const { service, calls } = setup()
    service.publish = async () => {
        throw new Error("kafka down")
    }

    await expect(service.create("u1", pricingInput)).rejects.toBeInstanceOf(InternalError)
    expect(calls).toEqual(["fail:Pricing could not be queued"])
})

test("get : demande terminée avec son résultat", async () => {
    const view = await setup(record({ status: "COMPLETED", result: pricingResult as never })).service.get("p1", "u1")

    expect(view).toMatchObject({ status: "COMPLETED", result: pricingResult, error: null })
})

test("get : demande en échec avec sa cause, sans résultat", async () => {
    const view = await setup(record({ status: "FAILED", error: "outside the rate curve" })).service.get("p1", "u1")

    expect(view).toMatchObject({ status: "FAILED", result: null, error: "outside the rate curve" })
})

test("get : inconnue → 404, autre propriétaire → 403", async () => {
    await expect(setup(null).service.get("p1", "u1")).rejects.toBeInstanceOf(NotFoundError)
    await expect(setup().service.get("p1", "u2")).rejects.toBeInstanceOf(ForbiddenError)
})

test("complete et fail : un rejeu (0 ligne modifiée) ne lève pas", async () => {
    const { service, calls } = setup(record(), false)

    await service.complete({ requestId: "p1", finishedAt: "2026-11-20T10:00:01.000Z", result: pricingResult })
    await service.fail({ requestId: "p1", finishedAt: "2026-11-20T10:00:01.000Z", reason: "boom" })

    expect(calls).toEqual(["complete", "fail:boom"])
})

test("get : demande PENDING depuis plus de PRICING_TIMEOUT_MS → FAILED enregistrée, relue", async () => {
    const created = new Date("2026-11-20T10:00:00Z")
    const { service, calls } = setup(record({ createdAt: created }))
    service.now = () => new Date(created.getTime() + PRICING_TIMEOUT_MS + 1)
    service.repo.getById = async () => (calls.length ? record({ status: "FAILED", error: "Pricing timed out: no answer from the pricing worker" }) : record({ createdAt: created }))

    const view = await service.get("p1", "u1")

    expect(calls).toEqual(["fail:Pricing timed out: no answer from the pricing worker"])
    expect(view).toMatchObject({ status: "FAILED", error: expect.stringContaining("timed out") })
})

test("get : demande PENDING récente → inchangée, rien n'est écrit", async () => {
    const { service, calls } = setup(record({ createdAt: new Date("2026-11-20T10:00:00Z") }))
    service.now = () => new Date("2026-11-20T10:00:30Z")

    expect((await service.get("p1", "u1")).status).toBe("PENDING")
    expect(calls).toEqual([])
})

test("OPTION : demande publiée avec son option, résultat d'option restitué à la fin", async () => {
    const optionResult = { kind: "OPTION", option: { call: { price: 10.45 } } }
    const { service, published } = setup(record({ kind: "OPTION", input: optionInput as never, status: "COMPLETED", result: optionResult as never }))

    await service.create("u1", optionInput)
    const view = await service.get("p1", "u1")

    expect(published).toEqual([{ requestId: "p1", ...optionInput }])
    expect(view).toMatchObject({ kind: "OPTION", status: "COMPLETED", result: optionResult })
})
