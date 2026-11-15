import { expect, test } from "bun:test"
import { commonDates, correlationMatrix, covarianceMatrix, dailyReturns, historicalVar, riskContributions, toEuros } from "../engine/risk.utils"

const correlation = (a: number[], b: number[]) => correlationMatrix(covarianceMatrix([a, b]))[0]![1]!

test("corrélation : jeux connus", () => {
    expect(correlation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10)
    expect(correlation([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 10)
    expect(correlation([1, -1, 1, -1], [1, 1, -1, -1])).toBeCloseTo(0, 10)
})

test("corrélation : diagonale 1, symétrique, série constante = 0", () => {
    const matrix = correlationMatrix(covarianceMatrix([[1, 2, 4], [3, 1, 2], [5, 5, 5]]))
    for (let i = 0; i < 3; i++) {
        expect(matrix[i]![i]).toBe(1)
        for (let j = 0; j < 3; j++) expect(matrix[i]![j]).toBeCloseTo(matrix[j]![i]!, 12)
    }
    expect(matrix[0]![2]).toBe(0)
})

test("VaR et CVaR : 100 rendements k/100 de −50 à 49", () => {
    const returns = Array.from({ length: 100 }, (_, i) => (i - 50) / 100)
    const { var95, cvar95 } = historicalVar(returns)
    expect(var95).toBeCloseTo(-0.46, 10)
    expect(cvar95).toBeCloseTo(-0.48, 10)
})

test("contributions : deux actifs non corrélés 50/50, volatilités 10 % et 20 %", () => {
    const cov = [[0.01, 0], [0, 0.04]]
    const [a, b] = riskContributions([0.5, 0.5], cov)
    expect(a).toBeCloseTo(0.2, 10)
    expect(b).toBeCloseTo(0.8, 10)
})

test("contributions : variance nulle → poids", () => {
    expect(riskContributions([0.3, 0.7], [[0, 0], [0, 0]])).toEqual([0.3, 0.7])
})

test("jours communs et rendements", () => {
    const a = [{ date: "2024-01-01", close: 100 }, { date: "2024-01-02", close: 110 }, { date: "2024-01-03", close: 99 }]
    const b = [{ date: "2024-01-02", close: 1 }, { date: "2024-01-03", close: 2 }]
    expect(commonDates([a, b])).toEqual(["2024-01-02", "2024-01-03"])
    const [up, down] = dailyReturns(a, ["2024-01-01", "2024-01-02", "2024-01-03"])
    expect(up).toBeCloseTo(0.1, 10)
    expect(down).toBeCloseTo(-0.1, 10)
})

test("conversion en euros : taux du jour, euros inchangés, taux manquant lève", () => {
    const prices = { US: [{ date: "2024-01-02", close: 110 }, { date: "2024-01-03", close: 120 }], FR: [{ date: "2024-01-02", close: 5 }] }
    const fx = { "EURUSD=X": [{ date: "2024-01-02", close: 1.1 }, { date: "2024-01-03", close: 1.2 }] }
    const out = toEuros(prices, { US: "USD", FR: "EUR" }, fx)
    out.US!.forEach((point) => expect(point.close).toBeCloseTo(100, 10))
    expect(out.FR).toBe(prices.FR)
    expect(() => toEuros(prices, { US: "USD" }, {})).toThrow("EURUSD=X")
})
