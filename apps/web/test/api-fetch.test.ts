import { afterEach, expect, spyOn, test } from "bun:test"
import { getBacktests, previewBacktest } from "../src/features/backtest/api"
import { getAssetsDetails } from "../src/features/market/api"
import { ApiError, apiFetch } from "../src/lib/api"

type Call = { url: string; init: RequestInit }
const calls: Call[] = []
let fetchSpy: ReturnType<typeof spyOn> | undefined

/** Remplace `fetch` par une réponse fixe et note chaque appel (frontière HTTP, aucun réseau). */
function respond(status: number, body?: unknown) {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (url: string, init: RequestInit) => {
        calls.push({ url, init })
        return new Response(body === undefined ? null : JSON.stringify(body), { status })
    }) as never)
}

afterEach(() => {
    fetchSpy?.mockRestore()
    calls.length = 0
})

test("apiFetch : URL de core-backend, cookies de session et Accept JSON, corps JSON renvoyé", async () => {
    respond(200, { ok: true })

    expect(await apiFetch("/backtest", { headers: { "X-Test": "1" } })).toEqual({ ok: true })
    expect(calls[0]!.url).toBe("http://localhost:8000/api/backtest")
    expect(calls[0]!.init).toMatchObject({
        credentials: "include",
        headers: { Accept: "application/json", "X-Test": "1" },
    })
})

test("apiFetch : 204 renvoie undefined", async () => {
    respond(204)

    expect(await apiFetch("/notifications/read")).toBeUndefined()
})

test("apiFetch : réponse non 2xx lève ApiError avec statut et code, corps non JSON → code null", async () => {
    respond(404, { error: "Backtest not found", code: "BACKTEST_NOT_FOUND" })
    const error = await apiFetch("/backtest/x").catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, code: "BACKTEST_NOT_FOUND" })

    fetchSpy?.mockRestore()
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>", { status: 502 }))
    expect(await apiFetch("/market/search").catch((e) => e)).toMatchObject({ status: 502, code: null })
})

test("getBacktests : pagination toujours, statuts et « avec résultat » seulement s'ils sont demandés", async () => {
    respond(200, { data: [] })

    await getBacktests({ page: 2, pageSize: 10, status: [] })
    await getBacktests({ page: 1, pageSize: 5, status: ["RUNNING", "PENDING"], hasResult: true })

    expect(calls.map(({ url }) => url.replace("http://localhost:8000/api", ""))).toEqual([
        "/backtest?page=2&pageSize=10",
        "/backtest?page=1&pageSize=5&status=RUNNING%2CPENDING&hasResult=true",
    ])
})

test("previewBacktest : premier benchmark envoyé seul (null sans benchmark), champs du lot de départs retirés", async () => {
    respond(200, {})
    const values = { name: "60/40", multipleStarts: true, extraStartDates: [{ date: new Date() }] } as never

    await previewBacktest({ ...(values as object), benchmarkSymbols: ["URTH", "SPY"] } as never)
    await previewBacktest({ ...(values as object), benchmarkSymbols: [] } as never)

    const bodies = calls.map(({ init }) => JSON.parse(init.body as string))
    expect(bodies[0]).toEqual({ name: "60/40", benchmarkSymbol: "URTH" })
    expect(bodies[1]).toEqual({ name: "60/40", benchmarkSymbol: null })
})

test("getAssetsDetails encode le symbole dans le chemin", async () => {
    respond(200, [])

    await getAssetsDetails("BRK/B", "1y")

    expect(calls[0]!.url).toBe("http://localhost:8000/api/market/details/BRK%2FB?period=1y")
})
