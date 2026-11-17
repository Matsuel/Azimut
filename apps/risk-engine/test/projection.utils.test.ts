import { expect, test } from "bun:test"
import { mulberry32, percentile } from "../engine/projection.utils"
import { portfolioReturns } from "../engine/risk.utils"

test("mulberry32 : même seed, mêmes tirages", () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b))
})

test("mulberry32 : seeds différentes, suites différentes", () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect(Array.from({ length: 5 }, a)).not.toEqual(Array.from({ length: 5 }, b))
})

test("mulberry32 : tirages dans [0, 1)", () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 10_000; i++) {
        const value = rng()
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
    }
})

test("percentile : interpolation linéaire", () => {
    const sorted = Float64Array.from([1, 2, 3, 4, 5])
    expect(percentile(sorted, 0.5)).toBe(3)
    expect(percentile(sorted, 0.25)).toBe(2)
    expect(percentile(sorted, 0.1)).toBeCloseTo(1.4, 10)
    expect(percentile(sorted, 1)).toBe(5)
})

test("portfolioReturns : moyenne pondérée de chaque jour", () => {
    expect(portfolioReturns([0.5, 0.5], [[0.1, 0.2], [0.3, 0]])).toEqual([0.2, 0.1])
})
