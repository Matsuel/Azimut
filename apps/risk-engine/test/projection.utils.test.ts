import { expect, test } from "bun:test"
import { percentile } from "../engine/projection.utils"
import { portfolioReturns } from "../engine/risk.utils"

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
