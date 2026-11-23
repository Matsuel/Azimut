import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import fr from "../messages/fr.json"
import type { ChainRow, OptionChainResult, PricingInput, PricingView } from "../src/features/pricing/types"

const getRateCurve = mock()
const createPricing = mock<(input: PricingInput) => Promise<PricingView>>()
const getPricing = mock<(id: string) => Promise<PricingView>>()
const getOptionInputs = mock()
mock.module("../src/features/pricing/api", () => ({ getRateCurve, createPricing, getPricing, getOptionInputs }))

const { OptionChainPage } = await import("../src/features/pricing/chain-page")

afterEach(cleanup)
beforeEach(() => {
    for (const fn of [createPricing, getPricing]) fn.mockReset()
})

const greeks = { delta: 0.54, gamma: 0.012, vega: 0.92, theta: -0.15, rho: 0.41 }
const row = (strike: number, side: "CALL" | "PUT", status: ChainRow["status"]): ChainRow => ({
    strike,
    side,
    bid: status === "KEPT" ? 15.7 : 0,
    ask: status === "KEPT" ? 16 : 0,
    mid: status === "KEPT" ? 15.85 : null,
    impliedVolatility: status === "KEPT" ? 0.186 : null,
    yahooVolatility: 0.184,
    status,
    greeks: status === "KEPT" ? greeks : null,
})
const chain: OptionChainResult = {
    symbol: "SPY",
    asOf: "2026-10-28",
    spot: 582,
    rate: 0.04,
    dividendYield: 0.012,
    contractsTotal: 3,
    contractsKept: 2,
    discarded: { noBidAsk: 1, noPrice: 0, ivOutOfBounds: 0 },
    atmVolatility: 0.184,
    historicalVolatility: 0.152,
    volatilityPremium: 0.032,
    smile: [
        {
            expiration: "2026-12-18",
            points: [
                { strike: 560, impliedVolatility: 0.2 },
                { strike: 600, impliedVolatility: 0.17 },
            ],
        },
    ],
    chainExpiration: "2026-12-18",
    chain: [row(580, "CALL", "KEPT"), row(590, "CALL", "NO_BID_ASK"), row(560, "PUT", "KEPT")],
}
const view = (status: PricingView["status"], extra: Partial<PricingView> = {}): PricingView => ({
    id: "c1",
    kind: "OPTION_CHAIN",
    status,
    input: { kind: "OPTION_CHAIN", chain: { symbol: "SPY" } },
    result: null,
    error: null,
    createdAt: "2026-10-28T10:00:00.000Z",
    ...extra,
})

function renderPage(symbol: string | null) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
        <NextIntlClientProvider locale="fr" messages={fr}>
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </NextIntlClientProvider>
    )
    return render(<OptionChainPage symbol={symbol} />, { wrapper })
}

test("lance le calcul de la chaîne à l'ouverture, puis affiche les cartes, le filtre et les grecques reçus", async () => {
    createPricing.mockResolvedValue(view("PENDING"))
    getPricing.mockResolvedValue(view("COMPLETED", { result: { kind: "OPTION_CHAIN", chain } }))

    renderPage("SPY")

    await waitFor(() => expect(screen.getByText("2 / 3")).toBeTruthy())
    expect(createPricing).toHaveBeenCalledTimes(1)
    expect(createPricing.mock.calls[0]![0]).toEqual({ kind: "OPTION_CHAIN", chain: { symbol: "SPY" } })
    expect(screen.getByText("Écarté · bid/ask nuls")).toBeTruthy()
    expect(screen.getByText("Delta")).toBeTruthy()
    expect(screen.getByText(/Perd .* par jour/)).toBeTruthy()
})

test("« Recalculer » relance une demande", async () => {
    createPricing.mockResolvedValue(view("COMPLETED", { result: { kind: "OPTION_CHAIN", chain } }))
    getPricing.mockResolvedValue(view("COMPLETED", { result: { kind: "OPTION_CHAIN", chain } }))

    renderPage("SPY")
    await waitFor(() => expect(screen.getByText("2 / 3")).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: "Recalculer" }))

    await waitFor(() => expect(createPricing).toHaveBeenCalledTimes(2))
})

test("calcul en échec : la cause est affichée", async () => {
    createPricing.mockResolvedValue(view("PENDING"))
    getPricing.mockResolvedValue(view("FAILED", { error: "SYMBOL_NOT_FOUND" }))

    renderPage("ZZZZ")

    await waitFor(() => expect(screen.getByText(/SYMBOL_NOT_FOUND/)).toBeTruthy())
})

test("sans symbole : invitation, aucun calcul lancé", () => {
    renderPage(null)

    expect(screen.getByText(/Ouvrez cette page depuis un symbole/)).toBeTruthy()
    expect(createPricing).not.toHaveBeenCalled()
})
