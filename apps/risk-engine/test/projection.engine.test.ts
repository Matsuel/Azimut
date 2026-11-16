import { expect, test } from "bun:test"
import { PROJECTION_PARAMS, projectionSchema } from "@azimut/contracts"
import { round } from "@azimut/utils"
import computeProjection from "../engine/projection.engine"

// Jours consécutifs à partir du 2023-01-02
const days = (count: number) => Array.from({ length: count }, (_, i) => new Date(Date.UTC(2023, 0, 2 + i)).toISOString().slice(0, 10))
const series = (count: number, close: (i: number) => number) => days(count).map((date, i) => ({ date, close: close(i) }))
// Rendements pseudo-variés, déterministes
const noisy = (i: number) => 100 * (1 + 0.001 * i + 0.02 * Math.sin(i * 1.7))

const capital = 10_000
const one = [{ symbol: "A", weight: 1 }]

test("un seul jour commun : null ; 249 jours : projection calculée (D12)", () => {
    expect(computeProjection(one, { A: series(1, noisy) }, capital, 42)).toBeNull()
    expect(computeProjection(one, { A: series(249, noisy) }, capital, 42)).not.toBeNull()
})

test("2 jours (1 rendement) : blocs d'1 jour, percentiles = capital × (1 + r)^252, r = 0,1 %", () => {
    const result = computeProjection(one, { A: series(2, (i) => 100 + 0.1 * i) }, capital, 42)!
    expect(projectionSchema.safeParse(result).success).toBe(true)
    expect(result.blockDays).toBe(1)
    expect(result.historyDays).toBe(2)
    expect(result.years[0]!.p5).toBeCloseTo(round(capital * 1.001 ** 252, 2), 2)
    expect(result.years[0]!.p95).toBeCloseTo(round(capital * 1.001 ** 252, 2), 2)
})

test("10 jours (9 rendements) : blocs de 9 jours, valide pour le contrat", () => {
    const result = computeProjection(one, { A: series(10, noisy) }, capital, 42)!
    expect(result.blockDays).toBe(9)
    expect(result.points.length).toBe(121)
    expect(projectionSchema.safeParse(result).success).toBe(true)
})

test("un actif sans cours : null", () => {
    expect(computeProjection([{ symbol: "A", weight: 0.5 }, { symbol: "B", weight: 0.5 }], { A: series(300, noisy) }, capital, 42)).toBeNull()
})

test("même seed : même résultat ; seed différente : p50 final différent", () => {
    const prices = { A: series(300, noisy) }
    const a = computeProjection(one, prices, capital, 42)!
    expect(computeProjection(one, prices, capital, 42)).toEqual(a)
    const b = computeProjection(one, prices, capital, 43)!
    expect(b.years[9]!.p50).not.toBe(a.years[9]!.p50)
})

test("forme du résultat, valide pour le contrat", () => {
    const result = computeProjection(one, { A: series(300, noisy) }, capital, 42)!
    expect(projectionSchema.safeParse(result).success).toBe(true)
    expect(result.points.length).toBe(121)
    expect(result.points[0]).toEqual({ day: 0, p5: capital, p10: capital, p25: capital, p50: capital, p75: capital, p90: capital, p95: capital })
    expect(result.years.length).toBe(10)
    expect(result.years[4]!.day).toBe(1260)
    expect(result.years[4]!.years).toBe(5)
    expect(result).toMatchObject({ seed: 42, paths: PROJECTION_PARAMS.paths, blockDays: 21, capital, historyStart: "2023-01-02", historyDays: 300 })
    expect(result.historyEnd).toBe(days(300)[299]!)
})

test("rendement constant +0,1 %/jour : percentiles de l'année 1 = capital × 1,001^252, perte nulle", () => {
    const result = computeProjection(one, { A: series(300, (i) => 100 * 1.001 ** i) }, capital, 42)!
    const expected = capital * 1.001 ** 252
    for (const key of ["p5", "p10", "p25", "p50", "p75", "p90", "p95"] as const) expect(result.years[0]![key]).toBeCloseTo(round(expected, 2), 2)
    expect(result.years[0]!.lossProbability).toBe(0)
})

test("rendements nuls : percentiles = capital, perte nulle", () => {
    const result = computeProjection(one, { A: series(300, () => 100) }, capital, 42)!
    for (const year of result.years) {
        expect(year.p5).toBe(capital)
        expect(year.p95).toBe(capital)
        expect(year.lossProbability).toBe(0)
    }
})

test("deux actifs identiques 50/50 : même résultat qu'un seul actif", () => {
    const s = series(300, noisy)
    const pair = computeProjection([{ symbol: "A", weight: 0.5 }, { symbol: "B", weight: 0.5 }], { A: s, B: s }, capital, 42)
    expect(pair).toEqual(computeProjection(one, { A: s }, capital, 42))
})
