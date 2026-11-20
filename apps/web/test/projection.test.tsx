import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { Profiler, type ReactNode } from "react"
import fr from "../messages/fr.json"
import type { BacktestExecution } from "../src/features/backtest/types"
import type { Projection, ProjectionView } from "../src/features/projection/types"

const getProjection = mock<(id: string) => Promise<ProjectionView>>()
mock.module("../src/features/projection/api", () => ({ getProjection }))
const push = mock<(href: string) => void>()
mock.module("next/navigation", () => ({ useRouter: () => ({ replace: () => {}, push }) }))
// La liste et le backtest passent par fetch : réponse vide, le backtest vient du cache
const fetchMock = spyOn(globalThis, "fetch")

const { BacktestProjection } = await import("../src/features/projection/backtest-projection")
const { ProjectionPercentiles } = await import("../src/features/projection/projection-percentiles")
const { ProjectionStats } = await import("../src/features/projection/projection-stats")
const { ComputedProjection } = await import("../src/features/projection/computed-projection")
const { projectionPollMs } = await import("../src/features/projection/utils")

afterEach(cleanup)
beforeEach(() => {
    getProjection.mockReset()
    push.mockReset()
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

const yearsUpTo = (count: number) =>
    Array.from({ length: count }, (_, i) => i + 1).map((n) => ({
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
const years = yearsUpTo(5)
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
    const pendingRow = screen.getByText("#2").closest('[role="listitem"]') as HTMLElement
    expect(within(pendingRow).getAllByText("—")).toHaveLength(2)
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

const tabLabels = () => screen.getAllByRole("tab").map((tab) => normalize(tab.textContent ?? ""))

test("projection sur 30 ans : six onglets d'horizon", async () => {
    getProjection.mockResolvedValue({
        state: "COMPUTED",
        projection: { ...projection, years: yearsUpTo(30) },
        history: [],
    })
    inFrench(<BacktestProjection backtestId="b1" />)

    await waitFor(() => expect(screen.getByText("Paramètres de la projection")).toBeTruthy())
    expect(tabLabels()).toEqual(["1 an", "3 ans", "5 ans", "10 ans", "20 ans", "30 ans"])
    fireEvent.click(screen.getByRole("tab", { name: "30 ans" }))
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(1 + 5))
})

test("tableau des percentiles : 5 lignes par page, la page suivante affiche les années suivantes", async () => {
    getProjection.mockResolvedValue({
        state: "COMPUTED",
        projection: { ...projection, years: yearsUpTo(30) },
        history: [],
    })
    inFrench(<BacktestProjection backtestId="b1" />)

    await waitFor(() => expect(screen.getByText("Paramètres de la projection")).toBeTruthy())
    fireEvent.click(screen.getByRole("tab", { name: "30 ans" }))
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(1 + 5))
    fireEvent.click(screen.getByLabelText("Page suivante"))
    await waitFor(() => expect(screen.getByText("6 ans")).toBeTruthy())
    expect(screen.getAllByRole("row")).toHaveLength(1 + 5)
})

test("ancienne projection sur 10 ans : quatre onglets, pas d'horizon au-delà", async () => {
    getProjection.mockResolvedValue({
        state: "COMPUTED",
        projection: { ...projection, years: yearsUpTo(10) },
        history: [],
    })
    inFrench(<BacktestProjection backtestId="b1" />)

    await waitFor(() => expect(screen.getByText("Paramètres de la projection")).toBeTruthy())
    expect(tabLabels()).toEqual(["1 an", "3 ans", "5 ans", "10 ans"])
})

test("projectionPollMs : attend PENDING, ou un premier calcul en cours, sinon s'arrête", () => {
    const run = (state: ProjectionView["state"]) => ({
        executionId: "e",
        attempt: 1,
        computedAt: null,
        durationMs: null,
        state,
    })
    const view = (state: ProjectionView["state"], history: ProjectionView["history"] = []): ProjectionView => ({
        state,
        projection: null,
        history,
    })

    expect(projectionPollMs(view("PENDING"))).toBe(2000)
    expect(projectionPollMs(view("UNAVAILABLE", [run("PENDING")]))).toBe(2000)
    expect(projectionPollMs(view("UNAVAILABLE", [run("UNAVAILABLE")]))).toBe(false)
    expect(projectionPollMs(view("UNAVAILABLE"))).toBe(false)
    expect(projectionPollMs(view("COMPUTED", [run("PENDING")]))).toBe(false)
    expect(projectionPollMs(view("INSUFFICIENT_DATA"))).toBe(false)
})

test("PENDING : deux relectures identiques ne redessinent pas l'écran, le passage à COMPUTED oui", async () => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
    })
    client.setQueryData(["backtest", "detail", "b1"], backtest)
    let commits = 0
    getProjection.mockImplementation(async () => ({ state: "PENDING", projection: null, history: [] }))
    render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="fr" messages={fr}>
                <Profiler id="projection" onRender={() => commits++}>
                    <BacktestProjection backtestId="b1" />
                </Profiler>
            </NextIntlClientProvider>
        </QueryClientProvider>,
    )
    await screen.findByText("Projection en cours de calcul…")
    const settled = commits

    await client.refetchQueries({ queryKey: ["projection"] })
    await client.refetchQueries({ queryKey: ["projection"] })
    expect(getProjection).toHaveBeenCalledTimes(3)
    expect(commits).toBe(settled)

    getProjection.mockImplementation(async () => ({ state: "COMPUTED", projection, history: [] }))
    await client.refetchQueries({ queryKey: ["projection"] })
    await screen.findByText("Paramètres de la projection")
    expect(commits).toBeGreaterThan(settled)
})

test("sans backtest choisi, le tableau des backtests s'affiche et un clic ouvre la projection", async () => {
    const listed = { ...backtest, id: "b7", investmentMode: "LUMP_SUM", executions: [] }
    fetchMock.mockImplementation((async () => Response.json({ data: [listed], count: 1 })) as unknown as typeof fetch)
    inFrench(<BacktestProjection backtestId="" />)

    fireEvent.click(await screen.findByText("Portefeuille A"))
    expect(push).toHaveBeenCalledWith("/app/projection?backtest=b7")
    expect(getProjection).not.toHaveBeenCalled()
})
