import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createTranslator, NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import fr from "../messages/fr.json"
import type { PricingInput, PricingView, RateCurve } from "../src/features/pricing/types"

const getRateCurve = mock<() => Promise<RateCurve>>()
const createPricing = mock<(input: PricingInput) => Promise<PricingView>>()
const getPricing = mock<(id: string) => Promise<PricingView>>()
mock.module("../src/features/pricing/api", () => ({ getRateCurve, createPricing, getPricing }))

const { RatesPage } = await import("../src/features/pricing/rates-page")
const { createBondSchema } = await import("../src/features/pricing/schema")
const { groupFlows, toPricingInput } = await import("../src/features/pricing/utils")

afterEach(cleanup)
beforeEach(() => {
    for (const fn of [getRateCurve, createPricing, getPricing]) fn.mockReset()
    getRateCurve.mockResolvedValue(curve)
})

const curve: RateCurve = {
    currency: "USD",
    points: [
        { symbol: "^IRX", maturityYears: 0.25, rate: 0.0432, date: "2026-10-28" },
        { symbol: "^FVX", maturityYears: 5, rate: 0.0398, date: "2026-10-28" },
        { symbol: "^TNX", maturityYears: 10, rate: 0.0421, date: "2026-10-28" },
        { symbol: "^TYX", maturityYears: 30, rate: 0.0456, date: "2026-10-28" },
    ],
}

const input: PricingInput = {
    kind: "BOND",
    bond: {
        nominal: 100,
        couponRate: 0,
        maturityYears: 5,
        discount: { source: "FLAT", rate: 0.03 },
        valueDate: "2026-10-28",
    },
}
const flows = [1, 2, 3, 4, 5].map((year) => ({
    year,
    date: `${2026 + year}-10-28`,
    cashFlow: year === 5 ? 100 : 0,
    discountFactor: year === 5 ? 0.862609 : 0.9,
    presentValue: year === 5 ? 86.26 : 0,
}))
const view = (status: PricingView["status"], extra: Partial<PricingView> = {}): PricingView => ({
    id: "p1",
    kind: "BOND",
    status,
    input,
    result: null,
    error: null,
    createdAt: "2026-11-20T10:00:00.000Z",
    ...extra,
})
const completed = view("COMPLETED", {
    result: {
        kind: "BOND",
        bond: {
            rate: 0.03,
            discountSource: "FLAT",
            curveDate: null,
            price: 86.26,
            totalCashFlow: 100,
            macaulayDuration: 5,
            modifiedDuration: 4.8544,
            priceChangeOnRatePlusOnePoint: -0.048544,
            flows,
        },
    },
})

const inFrench = (node: ReactNode) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="fr" messages={fr}>
                {node}
            </NextIntlClientProvider>
        </QueryClientProvider>,
    )
}

test("la saisie devient une demande : pourcentages en ratios, coupon à 0 pour un zéro-coupon", () => {
    const base = { nominal: 100, couponRate: 5, maturityYears: 5, valueDate: new Date(2026, 9, 28), flatRate: 3 }

    expect(toPricingInput({ ...base, type: "ZERO", discountSource: "FLAT" })).toEqual(input)
    expect(toPricingInput({ ...base, type: "COUPON", discountSource: "CURVE" }).bond).toMatchObject({
        couponRate: 0.05,
        discount: { source: "CURVE" },
    })
})

test("le schéma refuse une maturité hors 1 à 30, un nominal nul et un taux plat manquant", () => {
    const t = createTranslator({ locale: "fr", messages: fr, namespace: "pages.rates" })
    const schema = createBondSchema(t as never)
    const valid = {
        type: "ZERO",
        nominal: 100,
        couponRate: 0,
        maturityYears: 5,
        valueDate: new Date(),
        discountSource: "FLAT",
        flatRate: 3,
    }

    expect(schema.safeParse(valid).success).toBe(true)
    expect(schema.safeParse({ ...valid, maturityYears: 31 }).success).toBe(false)
    expect(schema.safeParse({ ...valid, maturityYears: 2.5 }).success).toBe(false)
    expect(schema.safeParse({ ...valid, nominal: 0 }).success).toBe(false)
    expect(schema.safeParse({ ...valid, flatRate: undefined }).success).toBe(false)
    expect(schema.safeParse({ ...valid, discountSource: "CURVE", flatRate: undefined }).success).toBe(true)
})

test("les échéances consécutives sans flux sont regroupées, les autres gardent leur ligne", () => {
    expect(groupFlows(flows).map(({ from, to }) => [from, to])).toEqual([
        [1, 4],
        [5, 5],
    ])
    expect(groupFlows(flows.map((flow) => ({ ...flow, cashFlow: 5 }))).map(({ from, to }) => [from, to])).toHaveLength(
        5,
    )
})

test("la page montre les quatre taux de la courbe et la mention « Taux US seulement »", async () => {
    inFrench(<RatesPage />)

    expect(await screen.findByText("4,32 %")).toBeTruthy()
    expect(screen.getByText("3,98 %")).toBeTruthy()
    expect(screen.getByText("4,21 %")).toBeTruthy()
    expect(screen.getByText("4,56 %")).toBeTruthy()
    expect(screen.getByText("Taux US seulement")).toBeTruthy()
    expect(screen.getByText("Saisissez une obligation, puis calculez son prix.")).toBeTruthy()
})

test("calculer envoie la saisie puis affiche le prix reçu, sans le recalculer", async () => {
    createPricing.mockResolvedValue(view("PENDING"))
    getPricing.mockResolvedValue(completed)
    inFrench(<RatesPage />)

    fireEvent.click(await screen.findByRole("button", { name: "Calculer le prix" }))

    await waitFor(() => expect(createPricing).toHaveBeenCalledTimes(1))
    expect(createPricing.mock.calls[0]![0]).toMatchObject({
        kind: "BOND",
        bond: { nominal: 100, couponRate: 0, maturityYears: 5, discount: { source: "FLAT", rate: 0.03 } },
    })
    expect(await screen.findByText(/86,26/, { selector: "span" })).toBeTruthy()
    expect(screen.getByText("Macaulay")).toBeTruthy()
    // Durations à 2 décimales fixes (maquette 35) et nominal entier sans décimales dans la légende
    expect(screen.getByText("5,00 ans")).toBeTruthy()
    expect(screen.getByText("4,85 ans")).toBeTruthy()
    expect(screen.getByText(/pour 100 € dans 5 ans/)).toBeTruthy()
    expect(screen.getByText("1 à 4")).toBeTruthy()
})

test("un calcul en échec affiche sa cause", async () => {
    createPricing.mockResolvedValue(view("PENDING"))
    getPricing.mockResolvedValue(view("FAILED", { error: "Maturity of 40 years is outside the rate curve" }))
    inFrench(<RatesPage />)

    fireEvent.click(await screen.findByRole("button", { name: "Calculer le prix" }))

    expect(await screen.findByText(/outside the rate curve/)).toBeTruthy()
})

test("courbe indisponible : message d'erreur et nouvel essai", async () => {
    getRateCurve.mockRejectedValue(new Error("boom"))
    inFrench(<RatesPage />)

    expect(await screen.findByText("Une erreur est survenue. Réessayez dans un instant.")).toBeTruthy()
    expect(screen.getAllByRole("button", { name: "Réessayer" }).length).toBeGreaterThan(0)
})
