import { afterAll, beforeAll, beforeEach, expect, spyOn, test } from "bun:test"
import { ForbiddenError } from "@azimut/http"
import { startApp } from "@azimut/http/testing"
import { auth } from "../lib/auth"
import createPricingRoutes from "../routes/pricing/pricing.routes"
import PricingService from "../services/pricing.service"
import { optionInput, optionParams, pricingInput } from "./pricing.fixture"

let signedIn = true
const session = spyOn(auth.api, "getSession").mockImplementation((async () => (signedIn ? { user: { id: "u1" } } : null)) as never)
const create = spyOn(PricingService.prototype, "create")
const get = spyOn(PricingService.prototype, "get")

let app: Awaited<ReturnType<typeof startApp>>
beforeAll(async () => {
    app = await startApp(createPricingRoutes())
})
afterAll(async () => {
    await app.close()
    ;[session, create, get].forEach((spy) => spy.mockRestore())
})
beforeEach(() => {
    signedIn = true
    create.mockReset()
    get.mockReset()
})

const post = (body: unknown) => app.request("/api/pricing", { method: "POST", body: JSON.stringify(body) })

test("sans session : 401", async () => {
    signedIn = false

    expect((await post(pricingInput)).status).toBe(401)
    expect((await app.request("/api/pricing/p1")).status).toBe(401)
})

test("POST /api/pricing : 202 avec la vue, le service reçoit l'utilisateur et la saisie", async () => {
    const view = { id: "p1", kind: "BOND", status: "PENDING", input: pricingInput, result: null, error: null, createdAt: "2026-11-20T10:00:00.000Z" }
    create.mockResolvedValue(view as never)

    const response = await post(pricingInput)

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual(view)
    expect(create.mock.calls[0]).toEqual(["u1", pricingInput])
})

test("POST invalide (maturité hors bornes, taux négatif) : 400 INVALID_PRICING", async () => {
    const bad = { ...pricingInput, bond: { ...pricingInput.bond, maturityYears: 31 } }

    const response = await post(bad)

    expect(response.status).toBe(400)
    expect(((await response.json()) as { code: string }).code).toBe("INVALID_PRICING")
    expect((await post({ ...pricingInput, bond: { ...pricingInput.bond, discount: { source: "FLAT", rate: -0.01 } } })).status).toBe(400)
    expect(create).not.toHaveBeenCalled()
})

test("POST OPTION valide : 202 ; spot, strike, volatilité ou maturité <= 0 : 400 INVALID_PRICING", async () => {
    create.mockResolvedValue({ id: "p2" } as never)

    expect((await post(optionInput)).status).toBe(202)
    expect(create.mock.calls[0]).toEqual(["u1", optionInput])
    create.mockClear()
    for (const field of ["spot", "strike", "volatility", "maturityYears"] as const) {
        const response = await post({ kind: "OPTION", option: { ...optionParams, [field]: 0 } })
        expect(response.status).toBe(400)
        expect(((await response.json()) as { code: string }).code).toBe("INVALID_PRICING")
    }
    expect(create).not.toHaveBeenCalled()
})

test("POST OPTION_MC : trajectoires par défaut 100 000, graine ignorée ; hors bornes : 400 INVALID_PRICING", async () => {
    create.mockResolvedValue({ id: "p3" } as never)
    const monteCarlo = { ...optionParams, barrier: 90 }

    expect((await post({ kind: "OPTION_MC", monteCarlo: { ...monteCarlo, seed: 7 } })).status).toBe(202)
    expect(create.mock.calls[0]).toEqual(["u1", { kind: "OPTION_MC", monteCarlo: { ...monteCarlo, paths: 100_000 } }])
    create.mockClear()
    for (const bad of [{ paths: 9_999 }, { paths: 1_000_001 }, { maturityYears: 1.5 }, { barrier: 0 }]) {
        const response = await post({ kind: "OPTION_MC", monteCarlo: { ...monteCarlo, ...bad } })
        expect(response.status).toBe(400)
        expect(((await response.json()) as { code: string }).code).toBe("INVALID_PRICING")
    }
    expect(create).not.toHaveBeenCalled()
})

test("POST STRUCTURED : produit transmis au service, prix client ignoré ; produit inconnu ou maturité hors bornes : 400 INVALID_PRICING", async () => {
    create.mockResolvedValue({ id: "p4" } as never)
    const structured = { product: "REVERSE_CONVERTIBLE" as const, underlying: "^STOXX50E", nominal: 1000, maturityYears: 5, rate: 0.03, volatility: 0.18, valueDate: "2026-10-28", couponRate: 0.04, putStrike: 1 }

    expect((await post({ kind: "STRUCTURED", structured: { ...structured, clientPrice: 900 } })).status).toBe(202)
    expect(create.mock.calls[0]).toEqual(["u1", { kind: "STRUCTURED", structured }])
    create.mockClear()
    for (const bad of [{ product: "WORST_OF" }, { maturityYears: 11 }, { putStrike: 0 }]) {
        const response = await post({ kind: "STRUCTURED", structured: { ...structured, ...bad } })
        expect(response.status).toBe(400)
        expect(((await response.json()) as { code: string }).code).toBe("INVALID_PRICING")
    }
    expect(create).not.toHaveBeenCalled()
})

test("GET /api/pricing/:id : le service reçoit l'id et l'utilisateur ; autre propriétaire : 403", async () => {
    get.mockResolvedValueOnce({ id: "p1" } as never)
    expect((await app.request("/api/pricing/p1")).status).toBe(200)
    expect(get.mock.calls[0]).toEqual(["p1", "u1"])

    get.mockRejectedValueOnce(new ForbiddenError())
    expect((await app.request("/api/pricing/p1")).status).toBe(403)
})

test("POST OPTION_CHAIN valide : 202, symbole nettoyé ; symbole vide : 400 INVALID_PRICING", async () => {
    create.mockResolvedValue({ id: "p3" } as never)

    expect((await post({ kind: "OPTION_CHAIN", chain: { symbol: " SPY " } })).status).toBe(202)
    expect(create.mock.calls[0]).toEqual(["u1", { kind: "OPTION_CHAIN", chain: { symbol: "SPY" } }])
    create.mockClear()

    const response = await post({ kind: "OPTION_CHAIN", chain: { symbol: " " } })
    expect(response.status).toBe(400)
    expect(((await response.json()) as { code: string }).code).toBe("INVALID_PRICING")
    expect(create).not.toHaveBeenCalled()
})
