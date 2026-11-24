import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import fr from "../messages/fr.json"
import type { OptionMonteCarloResult, PricingInput, PricingView } from "../src/features/pricing/types"

const getRateCurve = mock()
const createPricing = mock<(input: PricingInput) => Promise<PricingView>>()
const getPricing = mock<(id: string) => Promise<PricingView>>()
const getOptionInputs = mock()
mock.module("../src/features/pricing/api", () => ({ getRateCurve, createPricing, getPricing, getOptionInputs }))

const { MonteCarloPage } = await import("../src/features/pricing/monte-carlo-page")

afterEach(cleanup)
beforeEach(() => {
    for (const fn of [createPricing, getPricing, getRateCurve, getOptionInputs]) fn.mockReset()
    getRateCurve.mockResolvedValue({
        currency: "USD",
        points: [{ symbol: "^IRX", maturityYears: 0.25, rate: 0.04, date: "2026-10-28" }],
    })
})

const monteCarlo = {
    spot: 224.4,
    strike: 230,
    maturityYears: 182 / 365,
    rate: 0.04,
    dividendYield: 0.005,
    volatility: 0.243,
    barrier: 200,
    paths: 100_000,
}
const estimate = (price: number, standardError: number) => ({ price, standardError })
const result: OptionMonteCarloResult = {
    seed: 42,
    paths: 100_000,
    steps: 2,
    barrier: 200,
    barrierDirection: "DOWN",
    vanilla: estimate(14.63, 0.07),
    blackScholesPrice: 14.59,
    blackScholesGap: 0.6,
    validated: true,
    knockOut: estimate(11.92, 0.06),
    knockIn: estimate(2.71, 0.03),
    parityGap: 0,
    convergence: [
        { paths: 1_000, ...estimate(15.1, 0.7) },
        { paths: 100_000, ...estimate(14.63, 0.07) },
    ],
    sample: [
        { touched: false, prices: [224.4, 230, 240] },
        { touched: true, prices: [224.4, 210, 190] },
    ],
    sampleTouched: 1,
}
const view = (status: PricingView["status"], extra: Partial<PricingView> = {}): PricingView => ({
    id: "m1",
    kind: "OPTION_MC",
    status,
    input: { kind: "OPTION_MC", monteCarlo },
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
    return render(<MonteCarloPage symbol={null} />, { wrapper })
}

// Le libellé d'un champ à aide (`InfoHint`) porte aussi le bouton d'aide : on cherche le champ par le début de son nom
const field = (name: string) =>
    screen.getByRole("spinbutton", { name: new RegExp(`^${name.replace(/[()]/g, "\\$&")}`) }) as HTMLInputElement
const fill = (label: string, value: string) => fireEvent.change(field(label), { target: { value } })
const fillValid = async () => {
    await screen.findByText("Paramètres")
    for (const [label, value] of [
        ["Spot", "224.4"],
        ["Strike", "230"],
        ["Volatilité (%)", "24.3"],
        ["Barrière", "200"],
        ["Dividende continu (q) (%)", "0.5"],
    ] as const)
        fill(label, value)
}

test("lance un OPTION_MC (pourcentages en ratios, jours en années, graine absente), puis affiche prix, erreurs standard et parité", async () => {
    createPricing.mockResolvedValue(view("PENDING"))
    getPricing.mockResolvedValue(view("COMPLETED", { result: { kind: "OPTION_MC", monteCarlo: result } }))
    renderPage()
    await fillValid()

    fireEvent.click(screen.getByRole("button", { name: "Lancer la simulation" }))

    await waitFor(() => expect(screen.getByText("Prix Monte Carlo")).toBeTruthy())
    const sent = createPricing.mock.calls[0]![0]
    expect(sent.kind === "OPTION_MC" && sent.monteCarlo).toMatchObject({
        spot: 224.4,
        strike: 230,
        volatility: 0.243,
        dividendYield: 0.005,
        barrier: 200,
        paths: 100_000,
    })
    expect(sent.kind === "OPTION_MC" && "seed" in sent.monteCarlo).toBe(false)
    expect(screen.getByText("Validé · 0,6 ES")).toBeTruthy()
    expect(screen.getByText("= vanille")).toBeTruthy()
    expect(screen.getByText(/1 trajectoires sur 2 touchent la barrière/)).toBeTruthy()
    expect(screen.getByText(/seed 42/)).toBeTruthy()
})

test("barrière égale au spot ou trajectoires hors bornes : refusé sans appel", async () => {
    renderPage()
    await fillValid()
    fill("Barrière", "224.4")
    fill("Trajectoires", "5000")

    fireEvent.click(screen.getByRole("button", { name: "Lancer la simulation" }))

    await waitFor(() => expect(screen.getByText(/différente du spot/)).toBeTruthy())
    expect(screen.getByText(/entier de 10[\s  ]?000/)).toBeTruthy()
    expect(createPricing).not.toHaveBeenCalled()
})

test("calcul en échec : la cause est affichée", async () => {
    createPricing.mockResolvedValue(view("PENDING"))
    getPricing.mockResolvedValue(view("FAILED", { error: "Barrier must differ from the spot" }))
    renderPage()
    await fillValid()

    fireEvent.click(screen.getByRole("button", { name: "Lancer la simulation" }))

    await waitFor(() => expect(screen.getByText(/Barrier must differ/)).toBeTruthy())
})
