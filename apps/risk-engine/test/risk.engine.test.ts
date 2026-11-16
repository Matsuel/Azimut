import { expect, test } from "bun:test"
import computeRisk from "../engine/risk.engine"

// Jours ouvrés consécutifs à partir du 2023-01-02
const days = (count: number) => Array.from({ length: count }, (_, i) => new Date(Date.UTC(2023, 0, 2 + i)).toISOString().slice(0, 10))
const series = (count: number, close: (i: number) => number) => days(count).map((date, i) => ({ date, close: close(i) }))
// Rendements alternés +1 % / −1 % (A), −1 % / +1 % (B) : parfaitement anticorrélés
const wave = (sign: number) => {
    let value = 100
    return (i: number) => (value *= 1 + (i % 2 === 0 ? 0.01 : -0.01) * sign)
}

const allocations = [{ symbol: "A", weight: 0.3 }, { symbol: "B", weight: 0.3 }, { symbol: "C", weight: 0.3 }, { symbol: "D", weight: 0.1 }]

test("moins de 250 jours communs : null", () => {
    expect(computeRisk([{ symbol: "A", weight: 1 }], { A: series(249, wave(1)) })).toBeNull()
})

test("un actif sans cours : null", () => {
    expect(computeRisk([{ symbol: "A", weight: 0.5 }, { symbol: "B", weight: 0.5 }], { A: series(300, wave(1)) })).toBeNull()
})

test("deux actifs anticorrélés 50/50 : risque nul, corrélation −1", () => {
    const risk = computeRisk([{ symbol: "A", weight: 0.5 }, { symbol: "B", weight: 0.5 }], { A: series(300, wave(1)), B: series(300, wave(-1)) })!
    expect(risk.commonDays).toBe(300)
    expect(risk.correlations[0]![1]).toBeCloseTo(-1, 5)
    expect(risk.volatility).toBeCloseTo(0, 5)
    expect(risk.assets.map((a) => a.riskContribution).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5)
})

test("un seul actif : matrice 1, contribution 100 %, VaR perte d'un jour", () => {
    const risk = computeRisk([{ symbol: "A", weight: 1 }], { A: series(300, wave(1)) })!
    expect(risk.correlations).toEqual([[1]])
    expect(risk.assets[0]!.riskContribution).toBe(1)
    expect(risk.var95).toBeCloseTo(-0.01, 4)
    expect(risk.cvar95).toBeLessThanOrEqual(risk.var95)
})

test("concentration 30/30/30/10 : HHI 0,28, 3,6 actifs effectifs, poids max 0,3", () => {
    const prices = Object.fromEntries(allocations.map(({ symbol }, i) => [symbol, series(300, (t) => 100 + t + i * Math.sin(t))]))
    const risk = computeRisk(allocations, prices)!
    expect(risk.hhi).toBe(0.28)
    expect(risk.effectiveAssets).toBeCloseTo(3.571429, 6)
    expect(risk.maxWeight).toBe(0.3)
    expect(risk.assets.map((a) => a.symbol)).toEqual(["A", "B", "C", "D"])
})
