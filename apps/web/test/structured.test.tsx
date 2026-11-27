import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import fr from "../messages/fr.json"
import type { PricingInput, PricingView } from "../src/features/pricing/types"
import type { StructuredResult } from "../src/features/structured/types"
import { toStructuredPricingInput } from "../src/features/structured/utils"

const createPricing = mock<(input: PricingInput) => Promise<PricingView>>()
const getPricing = mock<(id: string) => Promise<PricingView>>()
const getRateCurve = mock()
const getOptionInputs = mock()
mock.module("../src/features/pricing/api", () => ({
    createPricing,
    getPricing,
    getRateCurve,
    getOptionInputs,
}))

const { StructuredPage } = await import("../src/features/structured/structured-page")

afterEach(cleanup)
beforeEach(() => {
    createPricing.mockReset()
    getPricing.mockReset()
    getRateCurve.mockReset()
    getOptionInputs.mockReset()
    // Sans marché lisible, le formulaire garde ses valeurs de départ
    getRateCurve.mockRejectedValue(new Error("no curve"))
    getOptionInputs.mockRejectedValue(new Error("no inputs"))
})

const common = {
    underlying: "^STOXX50E",
    nominal: 1000,
    maturityYears: 5,
    rate: 0.03,
    volatility: 0.18,
    dividendYield: 0,
    valueDate: "2026-10-28",
}
const totals = {
    clientPrice: 1000,
    payoff: [
        { underlyingChange: -0.5, payoff: 1000 },
        { underlyingChange: 0.6, payoff: 1432 },
    ],
}

const guaranteed: StructuredResult = {
    product: "CAPITAL_GUARANTEED",
    ...totals,
    fairValue: 962.4,
    fairValueRatio: 0.9624,
    margin: 37.6,
    marginRatio: 0.0376,
    bricks: [
        { type: "ZERO_COUPON", value: 862.61, ratio: 0.8626 },
        { type: "CALL", value: 99.79, ratio: 0.0998 },
    ],
    optionBudget: 99.79,
    callPrice: 138.6,
    participation: 0.72,
}
const convertible: StructuredResult = {
    product: "REVERSE_CONVERTIBLE",
    ...totals,
    fairValue: 954.86,
    fairValueRatio: 0.9549,
    margin: 45.14,
    marginRatio: 0.0451,
    bricks: [
        { type: "BOND", value: 1043.66, ratio: 1.0437 },
        { type: "PUT", value: -88.8, ratio: -0.0888 },
    ],
    putPrice: 88.8,
}
const autocallable: StructuredResult = {
    product: "AUTOCALLABLE",
    ...totals,
    fairValue: 951.6,
    fairValueRatio: 0.9516,
    margin: 48.4,
    marginRatio: 0.0484,
    bricks: [
        { type: "ZERO_COUPON", value: 860.71, ratio: 0.8607 },
        { type: "AUTOCALL_NET_COUPONS", value: 90.89, ratio: 0.0909 },
    ],
    standardError: 1.1,
    paths: 100_000,
    seed: 42,
    observations: [{ year: 1, date: "2027-10-28", recallLevel: 1, cumulativeCoupon: 0.06, recallProbability: 0.41 }],
    maturityProbability: 0.27,
    recallProbability: 0.73,
    maturityDate: "2031-10-28",
    maturityCumulativeCoupon: 0.3,
}
const structuredInputs = {
    CAPITAL_GUARANTEED: { product: "CAPITAL_GUARANTEED", ...common, guarantee: 1, callStrike: 1 },
    REVERSE_CONVERTIBLE: { product: "REVERSE_CONVERTIBLE", ...common, couponRate: 0.04, putStrike: 1 },
    AUTOCALLABLE: { product: "AUTOCALLABLE", ...common, couponRate: 0.06, recallLevel: 1, protectionBarrier: 0.6 },
} as const

const view = (
    status: PricingView["status"],
    product: StructuredResult["product"],
    extra: Partial<PricingView> = {},
): PricingView => ({
    id: "s1",
    kind: "STRUCTURED",
    status,
    input: { kind: "STRUCTURED", structured: structuredInputs[product] },
    result: null,
    error: null,
    createdAt: "2026-10-28T10:00:00.000Z",
    ...extra,
})

function renderPage() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
        <NextIntlClientProvider locale="fr" messages={fr}>
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </NextIntlClientProvider>
    )
    return render(<StructuredPage />, { wrapper })
}

const price = () => fireEvent.click(screen.getByRole("button", { name: "Pricer le produit" }))
const sentStructured = () => {
    const sent = createPricing.mock.calls[0]![0]
    return sent.kind === "STRUCTURED" ? sent.structured : null
}

test("capital garanti : envoie les ratios sans prix client, puis affiche juste valeur, marge, participation et briques telles que reçues", async () => {
    createPricing.mockResolvedValue(view("PENDING", "CAPITAL_GUARANTEED"))
    getPricing.mockResolvedValue(
        view("COMPLETED", "CAPITAL_GUARANTEED", { result: { kind: "STRUCTURED", structured: guaranteed } }),
    )
    renderPage()

    price()

    await waitFor(() => expect(screen.getAllByText(/962,40/).length).toBeGreaterThan(0))
    const sent = sentStructured()
    expect(sent).toMatchObject({
        product: "CAPITAL_GUARANTEED",
        nominal: 1000,
        maturityYears: 5,
        rate: 0.03,
        volatility: 0.18,
        dividendYield: 0,
        guarantee: 1,
        callStrike: 1,
    })
    expect(sent && "clientPrice" in sent).toBe(false)
    expect(screen.getAllByText(/37,60/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/72\s?%/).length).toBeGreaterThan(0)
    expect(screen.getByText("Zéro-coupon 5 ans")).toBeTruthy()
    expect(screen.getByText(/862,61/)).toBeTruthy()
    expect(screen.queryByLabelText(/Prix client/)).toBeNull()
})

test("reverse convertible : coupon et strike du put envoyés en ratios, put vendu en négatif dans les briques", async () => {
    createPricing.mockResolvedValue(view("PENDING", "REVERSE_CONVERTIBLE"))
    getPricing.mockResolvedValue(
        view("COMPLETED", "REVERSE_CONVERTIBLE", { result: { kind: "STRUCTURED", structured: convertible } }),
    )
    renderPage()

    fireEvent.click(screen.getByRole("tab", { name: "Reverse convertible" }))
    price()

    await waitFor(() => expect(screen.getByText("Vente de put")).toBeTruthy())
    expect(sentStructured()).toMatchObject({ product: "REVERSE_CONVERTIBLE", couponRate: 0.04, putStrike: 1 })
    expect(screen.getAllByText(/954,86/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/[-−]88,80/).length).toBeGreaterThan(0)
})

test("autocallable : niveaux envoyés en ratios, dates d'observation, probabilités et prix simulé affichés", async () => {
    createPricing.mockResolvedValue(view("PENDING", "AUTOCALLABLE"))
    getPricing.mockResolvedValue(
        view("COMPLETED", "AUTOCALLABLE", { result: { kind: "STRUCTURED", structured: autocallable } }),
    )
    renderPage()

    fireEvent.click(screen.getByRole("tab", { name: "Autocallable" }))
    price()

    await waitFor(() => expect(screen.getByText("Autocallable · dates d’observation")).toBeTruthy())
    expect(sentStructured()).toMatchObject({
        product: "AUTOCALLABLE",
        couponRate: 0.06,
        recallLevel: 1,
        protectionBarrier: 0.6,
    })
    expect(screen.getByText(/41\s?%/)).toBeTruthy()
    expect(screen.getByText(/27\s?%/)).toBeTruthy()
    expect(screen.getByText(/seed 42/)).toBeTruthy()
    expect(screen.getByText(/± .*1,10/)).toBeTruthy()
})

test("saisie hors bornes : refusée sans appel", async () => {
    renderPage()

    fireEvent.change(screen.getByRole("spinbutton", { name: /^Volatilité/ }), { target: { value: "600" } })
    price()

    await waitFor(() => expect(screen.getByText(/au plus 500 %/)).toBeTruthy())
    expect(createPricing).not.toHaveBeenCalled()
})

test("calcul en échec : la cause est affichée", async () => {
    createPricing.mockResolvedValue(view("PENDING", "CAPITAL_GUARANTEED"))
    getPricing.mockResolvedValue(view("FAILED", "CAPITAL_GUARANTEED", { error: "Option budget is not positive" }))
    renderPage()

    price()

    await waitFor(() => expect(screen.getByText(/Option budget is not positive/)).toBeTruthy())
})

test("toStructuredPricingInput : pourcentages en ratios, date du jour, champs du seul produit choisi", () => {
    const sent = toStructuredPricingInput(
        {
            product: "AUTOCALLABLE",
            underlying: "^FCHI",
            nominal: 500,
            maturityYears: 3,
            rate: 2.5,
            volatility: 20,
            dividendYield: 3,
            couponRate: 7,
            recallLevel: 95,
            protectionBarrier: 50,
            guarantee: 100,
        },
        new Date(2026, 9, 28),
    )

    expect(sent).toEqual({
        kind: "STRUCTURED",
        structured: {
            product: "AUTOCALLABLE",
            underlying: "^FCHI",
            nominal: 500,
            maturityYears: 3,
            rate: 0.025,
            volatility: 0.2,
            dividendYield: 0.03,
            valueDate: "2026-10-28",
            couponRate: 0.07,
            recallLevel: 0.95,
            protectionBarrier: 0.5,
        },
    })
})

test("sous-jacent : sa volatilité, son dividende et le taux à 5 ans préremplissent le formulaire, modifiables ensuite", async () => {
    getOptionInputs.mockResolvedValue({
        symbol: "^STOXX50E",
        currency: "EUR",
        spot: 5000,
        dividendYield: 0.031,
        volatility: 0.152,
    })
    getRateCurve.mockResolvedValue({
        currency: "USD",
        points: [
            { symbol: "^IRX", maturityYears: 0.25, rate: 0.04, date: "2026-10-28" },
            { symbol: "^FVX", maturityYears: 5, rate: 0.0385, date: "2026-10-28" },
        ],
    })
    createPricing.mockResolvedValue(view("PENDING", "CAPITAL_GUARANTEED"))
    getPricing.mockResolvedValue(view("PENDING", "CAPITAL_GUARANTEED"))
    renderPage()

    await waitFor(() =>
        expect((screen.getByRole("spinbutton", { name: /^Volatilité/ }) as HTMLInputElement).value).toBe("15.2"),
    )
    expect((screen.getByRole("spinbutton", { name: /^Rendement du dividende/ }) as HTMLInputElement).value).toBe("3.1")
    expect((screen.getByRole("spinbutton", { name: /^Taux/ }) as HTMLInputElement).value).toBe("3.85")
    price()

    await waitFor(() => expect(createPricing).toHaveBeenCalled())
    expect(sentStructured()).toMatchObject({ volatility: 0.152, dividendYield: 0.031, rate: 0.0385 })
})
