import { afterEach, expect, mock, spyOn, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import fr from "../messages/fr.json"
import type { BacktestExecution } from "../src/features/backtest/types"
import { AssetExposures } from "../src/features/risk/asset-exposures"
import { CorrelationMatrix } from "../src/features/risk/correlation-matrix"
import { DrawdownConstraint } from "../src/features/risk/drawdown-constraint"
import { RiskContributions } from "../src/features/risk/risk-contributions"
import { RiskStats } from "../src/features/risk/risk-stats"
import type { Risk, RiskReading, RiskView } from "../src/features/risk/types"
import { awaitResultPollMs } from "../src/features/risk/utils"

const push = mock<(href: string) => void>()
mock.module("next/navigation", () => ({ useRouter: () => ({ replace: () => {}, push }) }))
const { BacktestRisk } = await import("../src/features/risk/backtest-risk")

afterEach(cleanup)

const inFrench = (node: ReactNode) =>
    render(
        <NextIntlClientProvider locale="fr" messages={fr}>
            {node}
        </NextIntlClientProvider>,
    )

// Jeu de la maquette 33 : 30/30/30/10, valeurs telles que renvoyées par l'API
const risk: Risk = {
    commonDays: 2600,
    volatility: 0.132,
    var95: -0.014,
    cvar95: -0.021,
    assets: [
        { symbol: "AAPL", weight: 0.3, volatility: 0.271, riskContribution: 0.44 },
        { symbol: "MSFT", weight: 0.3, volatility: 0.254, riskContribution: 0.41 },
        { symbol: "IEF", weight: 0.3, volatility: 0.068, riskContribution: 0.09 },
        { symbol: "GLD", weight: 0.1, volatility: 0.142, riskContribution: 0.06 },
    ],
    correlations: [
        [1, 0.71, -0.18, 0.04],
        [0.71, 1, -0.15, 0.02],
        [-0.18, -0.15, 1, 0.32],
        [0.04, 0.02, 0.32, 1],
    ],
    hhi: 0.28,
    effectiveAssets: 3.571429,
    maxWeight: 0.3,
}
const reading: RiskReading = {
    mostCorrelatedPair: { first: "AAPL", second: "MSFT", correlation: 0.71 },
    topContributor: { symbol: "AAPL", riskContribution: 0.44 },
}
// Espaces insécables et signe moins : selon la version d'ICU, Intl écrit « − » (U+2212) ou « - »
const normalize = (value: string) => value.replace(/\s/g, " ").replace(/\u2212/g, "-")
const matches = (value: string) => (content: string) => normalize(content) === normalize(value)
const text = (value: string) => screen.getByText(matches(value))

test("les quatre cartes affichent volatilité, VaR, CVaR et concentration reçues", () => {
    inFrench(<RiskStats risk={risk} />)

    for (const value of ["13,2 %", "−1,4 %", "−2,1 %", "30 %", "HHI 0,28", "période"]) expect(text(value)).toBeTruthy()
    expect(screen.getByText(/3,6 actifs effectifs/)).toBeTruthy()
})

test("la matrice affiche les corrélations à deux décimales et la phrase de lecture du backend", () => {
    inFrench(<CorrelationMatrix risk={risk} reading={reading} />)

    expect(screen.getAllByText("1,00")).toHaveLength(4)
    expect(screen.getAllByText(matches("−0,18"))).toHaveLength(2)
    expect(screen.getByText(/AAPL et MSFT bougent ensemble \(0,71\)/)).toBeTruthy()
})

test("contributions et expositions : poids, part du risque et total du portefeuille", () => {
    inFrench(
        <>
            <RiskContributions risk={risk} reading={reading} />
            <AssetExposures risk={risk} />
        </>,
    )

    expect(text("Poids 30 % · Risque 44 %")).toBeTruthy()
    expect(screen.getByText(/AAPL pèse 30 % du capital mais 44 % du risque/)).toBeTruthy()
    expect(text("27,1 %")).toBeTruthy()
    // Ligne Total : volatilité du portefeuille, comme la carte
    expect(text("13,2 %")).toBeTruthy()
})

const constraint: RiskView["constraint"] = {
    measured: -0.214,
    current: { limit: 0.15, status: "VIOLATED" },
    previous: { limit: 0.25, status: "RESPECTED" },
}

test("contrainte : lignes Actuelle et Précédente, statuts et valeur mesurée", () => {
    inFrench(<DrawdownConstraint constraint={constraint} onCheck={() => {}} pending={false} />)

    expect(screen.getByText("Actuelle")).toBeTruthy()
    expect(text("Précédente · 25 %")).toBeTruthy()
    expect(screen.getByText("Non respectée")).toBeTruthy()
    expect(screen.getByText("Respectée")).toBeTruthy()
    expect(screen.getAllByText(matches("−21,4 %"))).toHaveLength(2)
})

test("contrainte : sans vérification, pas de tableau ; saisie hors plage refusée, valide envoyée en pourcent", async () => {
    const sent: number[] = []
    inFrench(<DrawdownConstraint constraint={null} onCheck={(p) => sent.push(p)} pending={false} />)
    expect(screen.queryByText("Actuelle")).toBeNull()

    const input = screen.getByLabelText(/Drawdown maximal accepté/)
    fireEvent.change(input, { target: { value: "100" } })
    fireEvent.click(screen.getByText("Vérifier"))
    await waitFor(() => expect(screen.getByText("Saisissez un entier de 1 à 99 %.")).toBeTruthy())
    expect(sent).toEqual([])

    fireEvent.change(input, { target: { value: "15" } })
    fireEvent.click(screen.getByText("Vérifier"))
    await waitFor(() => expect(sent).toEqual([15]))
})

test("awaitResultPollMs : attend le risque pendant une exécution ou juste après, pas pour un ancien résultat", () => {
    const view = { state: "UNAVAILABLE" as const }
    const execution = (status: string, finishedAt: string | null) => ({ status, finishedAt }) as BacktestExecution

    expect(awaitResultPollMs(view.state, execution("RUNNING", null))).toBe(2000)
    expect(awaitResultPollMs(view.state, execution("COMPLETED", new Date().toISOString()))).toBe(2000)
    expect(awaitResultPollMs(view.state, execution("COMPLETED", "2024-01-01T00:00:00.000Z"))).toBe(false)
    expect(awaitResultPollMs("COMPUTED", execution("RUNNING", null))).toBe(false)
})

test("sans backtest choisi, le tableau des backtests s'affiche et un clic ouvre la page Risque", async () => {
    const listed = {
        id: "b7",
        name: "Portefeuille A",
        investmentMode: "LUMP_SUM",
        startDate: "2016-01-01",
        endDate: "2026-06-30",
        allocations: [{ symbol: "AAPL", weight: "0.3" }],
        executions: [],
    }
    const fetchMock = spyOn(globalThis, "fetch").mockImplementation((async () =>
        Response.json({ data: [listed], count: 1 })) as unknown as typeof fetch)
    inFrench(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <BacktestRisk backtestId="" />
        </QueryClientProvider>,
    )

    fireEvent.click(await screen.findByText("Portefeuille A"))
    expect(push).toHaveBeenCalledWith("/app/risk?backtest=b7")
    fetchMock.mockRestore()
})
