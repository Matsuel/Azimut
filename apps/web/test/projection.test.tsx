import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import fr from "../messages/fr.json"
import type { BacktestExecution } from "../src/features/backtest/types"
import type { Projection, ProjectionView } from "../src/features/projection/types"

const getProjection = mock<(id: string) => Promise<ProjectionView>>()
mock.module("../src/features/projection/api", () => ({ getProjection }))
mock.module("next/navigation", () => ({ useRouter: () => ({ replace: () => {} }) }))
// Le picker et le backtest passent par fetch : réponse vide, le backtest vient du cache
const fetchMock = spyOn(globalThis, "fetch")

const { awaitResultPollMs } = await import("../src/features/backtest/result-wait")
const { BacktestProjection } = await import("../src/features/projection/backtest-projection")
const { ProjectionPercentiles } = await import("../src/features/projection/projection-percentiles")
const { ProjectionStats } = await import("../src/features/projection/projection-stats")
const { ComputedProjection } = await import("../src/features/projection/computed-projection")

afterEach(cleanup)
beforeEach(() => {
    getProjection.mockReset()
    fetchMock.mockReset()
    fetchMock.mockImplementation((async (url: URL | RequestInfo) =>
        Response.json(String(url).endsWith("/backtest/b1") ? backtest : { data: [] })) as typeof fetch)
})

const inFrench = (node: ReactNode, cached: object = backtest) => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
    })
    client.setQueryData(["backtest", "detail", "b1"], cached)
    return render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="fr" messages={fr}>
                {node}
            </NextIntlClientProvider>
        </QueryClientProvider>,
    )
}

const normalize = (value: string) => value.replace(/\s/g, " ").replace(/−/g, "-")
const matches = (value: string) => (content: string) => normalize(content) === normalize(value)

const execution = (status: string, finishedAt: string | null) => ({ status, finishedAt }) as BacktestExecution
const backtest = {
    name: "Portefeuille A",
    startDate: "2016-01-01",
    endDate: "2026-06-30",
    allocations: [{ symbol: "AAPL", weight: "0.3" }],
    executions: [execution("COMPLETED", "2024-01-01T00:00:00.000Z")],
}

const years = [1, 2, 3, 4, 5].map((n) => ({
    day: n * 252,
    years: n,
    p5: 8000,
    p10: 9000 + n * 100,
    p25: 10000,
    p50: n === 3 ? 15820 : 10000 + n * 1000,
    p75: 12000,
    p90: 12000 + n * 1000,
    p95: 20000,
    lossProbability: n === 3 ? 0.078 : 0.3,
}))
const projection: Projection = {
    seed: 42,
    paths: 10000,
    blockDays: 21,
    capital: 10000,
    historyStart: "2016-01-01",
    historyEnd: "2026-06-30",
    historyDays: 2600,
    points: [{ day: 0, p5: 10000, p10: 10000, p25: 10000, p50: 10000, p75: 10000, p90: 10000, p95: 10000 }],
    years,
}

test("horizon 3 : trois lignes au tableau et les valeurs de years[2] dans les cartes", () => {
    inFrench(
        <>
            <ProjectionStats year={years[2]} capital={10000} />
            <ProjectionPercentiles years={years} horizonYears={3} />
        </>,
    )

    expect(screen.getAllByRole("row")).toHaveLength(1 + 3)
    expect(screen.getAllByText(matches("15 820 €")).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(matches("7,8 %")).length).toBeGreaterThanOrEqual(2)
})

test("changer d'horizon ne déclenche aucune requête", async () => {
    getProjection.mockResolvedValue({ state: "COMPUTED", projection, history: [] })
    inFrench(<BacktestProjection backtestId="b1" />)

    await waitFor(() => expect(screen.getByText("Paramètres de la projection")).toBeTruthy())
    expect(screen.getAllByRole("row")).toHaveLength(1 + 5)
    fireEvent.click(screen.getByRole("tab", { name: "3 ans" }))
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(1 + 3))
    expect(getProjection).toHaveBeenCalledTimes(1)
})

test("INSUFFICIENT_DATA affiche « données insuffisantes »", async () => {
    getProjection.mockResolvedValue({ state: "INSUFFICIENT_DATA", projection: null, history: [] })
    inFrench(<BacktestProjection backtestId="b1" />)

    expect(await screen.findByText(/données insuffisantes/i)).toBeTruthy()
})

test("UNAVAILABLE affiche « Relancer le backtest »", async () => {
    getProjection.mockResolvedValue({ state: "UNAVAILABLE", projection: null, history: [] })
    inFrench(<BacktestProjection backtestId="b1" />)

    const button = await screen.findByText("Relancer le backtest")
    fireEvent.click(button)
    await waitFor(() =>
        expect(
            fetchMock.mock.calls.some(
                ([url, init]) => String(url).endsWith("/backtest/b1/executions") && init?.method === "POST",
            ),
        ).toBe(true),
    )
})

test("horizon absent des années reçues : message au lieu d'un écran vide", () => {
    inFrench(<ComputedProjection projection={projection} horizon={10} onHorizonChange={() => {}} />)

    expect(screen.getByText("Cet horizon n’est pas disponible pour cette projection.")).toBeTruthy()
})

const runs = [
    { executionId: "e2", attempt: 2, computedAt: null, durationMs: null, state: "PENDING" as const },
    {
        executionId: "e1",
        attempt: 1,
        computedAt: "2026-11-16T10:00:00.000Z",
        durationMs: 700,
        state: "COMPUTED" as const,
    },
    {
        executionId: "e0",
        attempt: 0,
        computedAt: "2026-11-15T10:00:00.000Z",
        durationMs: 65_400,
        state: "INSUFFICIENT_DATA" as const,
    },
]

test("historique des calculs : une ligne par exécution avec durée, <Dash /> sans durée", async () => {
    getProjection.mockResolvedValue({ state: "COMPUTED", projection, history: runs })
    inFrench(<BacktestProjection backtestId="b1" />)

    expect(await screen.findByText("Historique des calculs")).toBeTruthy()
    expect(screen.getByText("en 0,7 s")).toBeTruthy()
    expect(screen.getByText("en 1 min 5 s")).toBeTruthy()
    expect(screen.getByText("#2")).toBeTruthy()
    expect(screen.getByText("Données insuffisantes")).toBeTruthy()
    // Ligne en cours : ni date ni durée, deux tirets
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2)
})

test("PENDING juste après l'exécution : badge « En cours » et carte d'état, sans bouton", async () => {
    getProjection.mockResolvedValue({ state: "PENDING", projection: null, history: [] })
    const fresh = { ...backtest, executions: [execution("COMPLETED", new Date().toISOString())] }
    inFrench(<BacktestProjection backtestId="b1" />, fresh)

    expect(await screen.findByText("Projection en cours de calcul…")).toBeTruthy()
    expect(screen.getByText("En cours")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Relancer le backtest" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull()
})

test("PENDING au-delà de 2 minutes : « prend plus de temps » et « Réessayer » relit la projection", async () => {
    getProjection.mockResolvedValue({ state: "PENDING", projection: null, history: [] })
    inFrench(<BacktestProjection backtestId="b1" />)

    expect(await screen.findByText("Le calcul prend plus de temps que prévu.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }))
    await waitFor(() => expect(getProjection).toHaveBeenCalledTimes(2))
})

test("awaitResultPollMs : PENDING rafraîchi dans la fenêtre d'attente, plus après", () => {
    expect(awaitResultPollMs("PENDING", execution("COMPLETED", new Date().toISOString()))).toBe(2000)
    expect(awaitResultPollMs("PENDING", execution("COMPLETED", "2024-01-01T00:00:00.000Z"))).toBe(false)
    expect(awaitResultPollMs("PENDING", execution("FAILED", new Date().toISOString()))).toBe(false)
})
