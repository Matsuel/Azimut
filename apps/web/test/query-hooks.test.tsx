import { afterEach, expect, spyOn, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { useBacktestComparison, useBacktestPreview, useCreateBacktest } from "../src/features/backtest/hook"
import { useMarketSearch } from "../src/features/market/hook"
import { useSetRiskLimit } from "../src/features/risk/hook"

const urls: string[] = []
let fetchSpy: ReturnType<typeof spyOn> | undefined

/** `fetch` répond `body` à tout appel et note l'URL relative à core-backend. */
function respond(body: unknown) {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (url: string) => {
        urls.push(url.replace("http://localhost:8000/api", ""))
        return new Response(JSON.stringify(body), { status: 200 })
    }) as never)
}

function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    return { client, wrapper }
}

afterEach(() => {
    cleanup()
    fetchSpy?.mockRestore()
    urls.length = 0
})

test("comparaison : aucune requête sans deux ids distincts", async () => {
    respond({})
    const { wrapper } = setup()

    renderHook(() => useBacktestComparison("a", "a"), { wrapper })
    renderHook(() => useBacktestComparison("a", ""), { wrapper })
    renderHook(() => useBacktestComparison("a", "b"), { wrapper })

    await waitFor(() => expect(urls).toEqual(["/backtest/compare?ids=a,b"]))
})

test("recherche de marché : aucune requête sous la longueur minimale", async () => {
    respond([])
    const { wrapper } = setup()

    renderHook(() => useMarketSearch("a"), { wrapper })
    renderHook(() => useMarketSearch("app"), { wrapper })

    await waitFor(() => expect(urls).toEqual(["/market/search?query=app"]))
})

test("aperçu d'un backtest : aucune requête tant que le formulaire est invalide (valeurs null)", async () => {
    respond({})
    const { wrapper } = setup()

    const { result } = renderHook(() => useBacktestPreview(null), { wrapper })

    expect(result.current.fetchStatus).toBe("idle")
    expect(urls).toEqual([])
})

test("créer un backtest invalide la liste et les compteurs", async () => {
    respond({ id: "b1" })
    const { client, wrapper } = setup()
    const invalidate = spyOn(client, "invalidateQueries")

    const { result } = renderHook(() => useCreateBacktest(), { wrapper })
    await act(() => result.current.mutateAsync({ benchmarkSymbols: [] } as never))

    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
        ["backtest", "list"],
        ["backtest", "stats"],
    ])
})

test("enregistrer la limite de drawdown remplace la vue du risque en cache par celle du backend", async () => {
    const view = { status: "READY", maxDrawdownLimit: 0.15 }
    respond(view)
    const { client, wrapper } = setup()

    const { result } = renderHook(() => useSetRiskLimit("b1"), { wrapper })
    await act(() => result.current.mutateAsync(0.15))

    expect(client.getQueryData(["risk", "detail", "b1"])).toEqual(view)
})
