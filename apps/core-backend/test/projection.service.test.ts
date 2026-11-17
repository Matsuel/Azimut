import { expect, test } from "bun:test"
import type { Projection } from "@azimut/contracts"
import type { IProjectionRepository } from "../repositories/projection.repository"
import type { ProjectionRecord, ProjectionRunRecord } from "../interfaces/projection.interface"
import { PROJECTION_TIMEOUT_MS } from "../constants/projection.constants"
import ProjectionService from "../services/projection.service"

const projection: Projection = {
    seed: 42,
    paths: 10000,
    blockDays: 21,
    capital: 1000,
    historyStart: "2023-01-02",
    historyEnd: "2024-12-31",
    historyDays: 500,
    points: [],
    years: [],
}

// Backtest de u1 avec un résultat dont la projection est reçue ; `result` change ou retire le résultat
function record(result: Partial<NonNullable<ProjectionRecord["result"]>> | null = {}, runs: ProjectionRunRecord[] = []): ProjectionRecord {
    return {
        userId: "u1",
        runs,
        result:
            result === null
                ? null
                : { projection: projection as never, createdAt: new Date(), projectionComputedAt: new Date(), projectionExpected: true, projectionDurationMs: 700, ...result },
    }
}

function setup(current: ProjectionRecord | null, firstReception = true) {
    const notified: Parameters<ProjectionService["notify"]>[0][] = []
    const stored: { executionId: string; projection: Projection | null; durationMs: number | null }[] = []
    const service = new ProjectionService()
    service.notify = async (payload) => void notified.push(payload)
    service.repo = {
        getByBacktestId: async () => current,
        setProjection: async (executionId: string, value: Projection | null, _computedAt: Date, durationMs: number | null) => {
            stored.push({ executionId, projection: value, durationMs })
            return firstReception
        },
        getExecutionBacktest: async () => ({ id: "b1", userId: "u1", name: "Mon backtest" }),
    } as IProjectionRepository
    return { service, stored, notified }
}

test("projection calculée : COMPUTED", async () => {
    expect(await setup(record()).service.get("b1", "u1")).toEqual({ state: "COMPUTED", projection, history: [] })
})

test("projection.completed avec projection null : INSUFFICIENT_DATA", async () => {
    const view = await setup(record({ projection: null })).service.get("b1", "u1")

    expect(view).toEqual({ state: "INSUFFICIENT_DATA", projection: null, history: [] })
})

test("résultat créé avec projection attendue mais pas encore reçue : PENDING", async () => {
    const view = await setup(record({ projection: null, projectionComputedAt: null, projectionDurationMs: null })).service.get("b1", "u1")

    expect(view).toEqual({ state: "PENDING", projection: null, history: [] })
})

test("ancien résultat sans projection attendue, ou sans résultat terminé : UNAVAILABLE", async () => {
    const old = record({ projection: null, projectionComputedAt: null, projectionExpected: false, projectionDurationMs: null })
    expect(await setup(old).service.get("b1", "u1")).toEqual({ state: "UNAVAILABLE", projection: null, history: [] })
    expect(await setup(record(null)).service.get("b1", "u1")).toEqual({ state: "UNAVAILABLE", projection: null, history: [] })
})

test("ancien résultat dont la projection est reçue : COMPUTED", async () => {
    const view = await setup(record({ projectionExpected: false, projectionDurationMs: null })).service.get("b1", "u1")

    expect(view).toEqual({ state: "COMPUTED", projection, history: [] })
})

// Exécution d'un backtest : `result` null = exécution en cours, sans résultat
const run = (attempt: number, result: ProjectionRunRecord["result"]): ProjectionRunRecord => ({ id: `e${attempt}`, attempt, result })
const computedAt = new Date("2026-11-16T10:00:00.000Z")

test("historique : une ligne par exécution, ordre du repository, état et durée de chacune", async () => {
    const runs = [
        run(4, null),
        run(3, { createdAt: computedAt, projectionComputedAt: computedAt, projectionExpected: true, projectionDurationMs: 700, hasProjection: true }),
        run(2, { createdAt: computedAt, projectionComputedAt: computedAt, projectionExpected: true, projectionDurationMs: 12, hasProjection: false }),
        run(1, { createdAt: computedAt, projectionComputedAt: null, projectionExpected: false, projectionDurationMs: null, hasProjection: false }),
    ]

    const { history } = await setup(record({}, runs)).service.get("b1", "u1")

    expect(history).toEqual([
        { executionId: "e4", attempt: 4, computedAt: null, durationMs: null, state: "PENDING" },
        { executionId: "e3", attempt: 3, computedAt: "2026-11-16T10:00:00.000Z", durationMs: 700, state: "COMPUTED" },
        { executionId: "e2", attempt: 2, computedAt: "2026-11-16T10:00:00.000Z", durationMs: 12, state: "INSUFFICIENT_DATA" },
        { executionId: "e1", attempt: 1, computedAt: null, durationMs: null, state: "UNAVAILABLE" },
    ])
})

test("historique : un résultat attendu mais pas encore reçu est PENDING, comme la vue", async () => {
    const pending = { createdAt: new Date(), projectionComputedAt: null, projectionExpected: true, projectionDurationMs: null, hasProjection: false }

    const { history } = await setup(record({}, [run(1, pending)])).service.get("b1", "u1")

    expect(history[0]?.state).toBe("PENDING")
})

// Résultat créé il y a `ageMs` sans projection reçue, horloge du service figée sur `now`
const now = new Date("2026-11-16T12:00:00.000Z")
const waiting = (ageMs: number) => ({ createdAt: new Date(now.getTime() - ageMs), projectionComputedAt: null, projectionExpected: true, projectionDurationMs: null, hasProjection: false })

test("attente de la projection : PENDING avant le délai, UNAVAILABLE après (vue)", async () => {
    for (const [ageMs, state] of [[PROJECTION_TIMEOUT_MS, "PENDING"], [PROJECTION_TIMEOUT_MS + 1, "UNAVAILABLE"]] as const) {
        const { service } = setup(record({ projection: null, ...waiting(ageMs) }))
        service.now = () => now

        expect((await service.get("b1", "u1")).state).toBe(state)
    }
})

test("attente de la projection : PENDING avant le délai, UNAVAILABLE après (historique)", async () => {
    const { service } = setup(record({}, [run(2, waiting(PROJECTION_TIMEOUT_MS - 1)), run(1, waiting(PROJECTION_TIMEOUT_MS + 1))]))
    service.now = () => now

    const { history } = await service.get("b1", "u1")

    expect(history.map(({ state }) => state)).toEqual(["PENDING", "UNAVAILABLE"])
})

test("autre propriétaire : 403 ; backtest inconnu : 404", async () => {
    await expect(setup(record()).service.get("b1", "u2")).rejects.toMatchObject({ statusCode: 403 })
    await expect(setup(null).service.get("b1", "u1")).rejects.toMatchObject({ statusCode: 404, code: "BACKTEST_NOT_FOUND" })
})

test("store enregistre la projection de l'exécution, y compris null", async () => {
    const { service, stored } = setup(record())

    await service.store({ executionId: "e1", finishedAt: "2024-01-01T00:00:00.000Z", durationMs: 700, projection })
    await service.store({ executionId: "e2", finishedAt: "2024-01-01T00:00:00.000Z", durationMs: 12, projection: null })

    expect(stored).toEqual([{ executionId: "e1", projection, durationMs: 700 }, { executionId: "e2", projection: null, durationMs: 12 }])
})

test("store sans durationMs enregistre une durée null", async () => {
    const { service, stored } = setup(record())

    await service.store({ executionId: "e3", finishedAt: "2024-01-01T00:00:00.000Z", projection })

    expect(stored).toEqual([{ executionId: "e3", projection, durationMs: null }])
})

test("projection.completed publie PROJECTION_COMPLETED (scénarios, perte à l'horizon final) à la première réception", async () => {
    const withYears: Projection = { ...projection, years: [{ years: 1, lossProbability: 0.3 }, { years: 30, lossProbability: 0.05 }] as never }
    const { service, notified } = setup(record())

    await service.store({ executionId: "e1", finishedAt: "2024-01-01T00:00:00.000Z", projection: withYears })

    expect(notified).toEqual([
        {
            userId: "u1",
            type: "PROJECTION_COMPLETED",
            dedupKey: "PROJECTION_COMPLETED:e1",
            occurredAt: "2024-01-01T00:00:00.000Z",
            params: { backtestId: "b1", name: "Mon backtest", scenarios: 10000, lossProbability: 0.05 },
        },
    ])
})

test("projection.completed : rien pour une projection null ni pour un rejeu", async () => {
    const withYears: Projection = { ...projection, years: [{ years: 30, lossProbability: 0.05 }] as never }
    const nullCase = setup(record())
    await nullCase.service.store({ executionId: "e1", finishedAt: "2024-01-01T00:00:00.000Z", projection: null })
    const replay = setup(record(), false)
    await replay.service.store({ executionId: "e1", finishedAt: "2024-01-01T00:00:00.000Z", projection: withYears })

    expect(nullCase.notified).toEqual([])
    expect(replay.notified).toEqual([])
})
