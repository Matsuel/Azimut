import { expect, test } from "bun:test"
import { mulberry32, standardNormal } from "@azimut/utils"
import { aggregate, basketOptions, cholesky, correlatedDraws, resolveUnderlyings } from "../engine/basket"
import { blackScholes } from "../engine/options"

const asset = { volatility: 0.2, dividendYield: 0.02 }
const rate = Math.log(1.03)
const bs = blackScholes({ spot: 1, strike: 1, maturityYears: 3, rate, dividendYield: 0.02, volatility: 0.2 })
const options = (correlation: number, mode: "WORST_OF" | "BEST_OF" | "AVERAGE") =>
    basketOptions(
        {
            assets: [asset, asset],
            correlations: [
                [1, correlation],
                [correlation, 1],
            ],
            mode,
        },
        { rate, years: 3, strike: 1, seed: 42, paths: 50_000 },
    )

test("cholesky : L·Lᵗ redonne la matrice ; semi-définie acceptée, non semi-définie refusée", () => {
    const matrix = [
        [1, 0.5, 0.2],
        [0.5, 1, 0.4],
        [0.2, 0.4, 1],
    ]
    const lower = cholesky(matrix)
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const product = lower[i]!.reduce((total, value, k) => total + value * lower[j]![k]!, 0)
            expect(product).toBeCloseTo(matrix[i]![j]!, 10)
        }
    }
    expect(() =>
        cholesky([
            [1, 1],
            [1, 1],
        ]),
    ).not.toThrow()
    expect(() =>
        cholesky([
            [1, 0.9, -0.9],
            [0.9, 1, 0.9],
            [-0.9, 0.9, 1],
        ]),
    ).toThrow("positive semi-definite")
})

test("aggregate : pire, meilleur, moyenne ; sous-jacent unique : son niveau", () => {
    expect(aggregate("WORST_OF", [1.2, 0.8, 1])).toBe(0.8)
    expect(aggregate("BEST_OF", [1.2, 0.8, 1])).toBe(1.2)
    expect(aggregate("AVERAGE", [1.2, 0.8, 1])).toBeCloseTo(1, 12)
    expect(aggregate(null, [0.9])).toBe(0.9)
})

test("tirages corrélés : un seul sous-jacent redonne exactement les tirages du générateur", () => {
    const plain = standardNormal(mulberry32(42))
    const correlated = correlatedDraws(standardNormal(mulberry32(42)), cholesky([[1]]))
    for (let i = 0; i < 50; i++) expect(correlated()[0]).toBe(plain())
})

test("tirages corrélés : la corrélation empirique suit la matrice", () => {
    const draw = correlatedDraws(standardNormal(mulberry32(7)), cholesky([[1, 0.7], [0.7, 1]]))
    let xy = 0
    let xx = 0
    let yy = 0
    const count = 50_000
    for (let i = 0; i < count; i++) {
        const [x, y] = draw() as [number, number]
        xy += x * y
        xx += x * x
        yy += y * y
    }
    expect(xy / Math.sqrt(xx * yy)).toBeCloseTo(0.7, 1)
})

test("resolveUnderlyings : sous-jacent unique des champs communs, ou panier", () => {
    const common = { volatility: 0.18, dividendYield: 0.02 }
    expect(resolveUnderlyings({ ...common } as never)).toEqual({ assets: [common], correlations: [[1]], mode: null })
    const basket = { mode: "BEST_OF", underlyings: [{ symbol: "A", spot: 1, volatility: 0.3, dividendYield: 0 }], correlations: [[1]] }
    expect(resolveUnderlyings({ ...common, basket } as never)).toEqual({ assets: [{ volatility: 0.3, dividendYield: 0 }], correlations: [[1]], mode: "BEST_OF" })
})

test("panier de deux sous-jacents identiques corrélés à 1 : l'option vaut celle du sous-jacent (Black-Scholes)", () => {
    const { call, put } = options(1, "WORST_OF")
    expect(call).toBeCloseTo(bs.call, 1)
    expect(put).toBeCloseTo(bs.put, 1)
})

test("worst-of moins cher que best-of en call ; la corrélation relève le worst-of et abaisse le best-of", () => {
    expect(options(0.3, "WORST_OF").call).toBeLessThan(options(0.3, "BEST_OF").call)
    expect(options(0.9, "WORST_OF").call).toBeGreaterThan(options(0.1, "WORST_OF").call)
    expect(options(0.9, "WORST_OF").put).toBeLessThan(options(0.1, "WORST_OF").put)
    expect(options(0.9, "BEST_OF").call).toBeLessThan(options(0.1, "BEST_OF").call)
})

test("même graine, même prix", () => {
    expect(options(0.5, "AVERAGE")).toEqual(options(0.5, "AVERAGE"))
})
