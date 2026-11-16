import { expect, test } from "bun:test"
import type { Projection } from "@azimut/contracts"
import type { IProjectionRepository } from "../repositories/projection.repository"
import type { ProjectionRecord } from "../interfaces/projection.interface"
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
function record(result: Partial<NonNullable<ProjectionRecord["result"]>> | null = {}): ProjectionRecord {
    return {
        userId: "u1",
        result: result === null ? null : { projection: projection as never, projectionComputedAt: new Date(), ...result },
    }
}

function setup(current: ProjectionRecord | null) {
    const stored: { executionId: string; projection: Projection | null }[] = []
    const service = new ProjectionService()
    service.repo = {
        getByBacktestId: async () => current,
        setProjection: async (executionId: string, value: Projection | null) => {
            stored.push({ executionId, projection: value })
            return true
        },
    } as IProjectionRepository
    return { service, stored }
}

test("projection calculée : COMPUTED", async () => {
    expect(await setup(record()).service.get("b1", "u1")).toEqual({ state: "COMPUTED", projection })
})

test("projection.completed avec projection null : INSUFFICIENT_DATA", async () => {
    const view = await setup(record({ projection: null })).service.get("b1", "u1")

    expect(view).toEqual({ state: "INSUFFICIENT_DATA", projection: null })
})

test("sans projectionComputedAt ou sans résultat terminé : UNAVAILABLE", async () => {
    expect(await setup(record({ projection: null, projectionComputedAt: null })).service.get("b1", "u1")).toEqual({ state: "UNAVAILABLE", projection: null })
    expect(await setup(record(null)).service.get("b1", "u1")).toEqual({ state: "UNAVAILABLE", projection: null })
})

test("autre propriétaire : 403 ; backtest inconnu : 404", async () => {
    await expect(setup(record()).service.get("b1", "u2")).rejects.toMatchObject({ statusCode: 403 })
    await expect(setup(null).service.get("b1", "u1")).rejects.toMatchObject({ statusCode: 404, code: "BACKTEST_NOT_FOUND" })
})

test("store enregistre la projection de l'exécution, y compris null", async () => {
    const { service, stored } = setup(record())

    await service.store({ executionId: "e1", finishedAt: "2024-01-01T00:00:00.000Z", projection })
    await service.store({ executionId: "e2", finishedAt: "2024-01-01T00:00:00.000Z", projection: null })

    expect(stored).toEqual([{ executionId: "e1", projection }, { executionId: "e2", projection: null }])
})
