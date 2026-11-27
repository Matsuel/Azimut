import { expect, test } from "bun:test"
import { historicalVolatility, median, returnsCorrelation, round, type DatedClose } from "@azimut/utils"

test("median : valeur centrale si le nombre est impair", () => {
    expect(median([3, 1, 2])).toBe(2)
})

test("median : moyenne des deux valeurs centrales si le nombre est pair", () => {
    expect(median([4, 1, 3, 2])).toBe(2.5)
})

test("median ne modifie pas l'entrée et vaut NaN sans valeur", () => {
    const values = [3, 1, 2]
    median(values)
    expect(values).toEqual([3, 1, 2])
    expect(median([])).toBeNaN()
})

test("round : arrondit au nombre de décimales demandé", () => {
    expect(round(1.23456, 2)).toBe(1.23)
    expect(round(0.0333333, 6)).toBe(0.033333)
})

// Clôtures qui alternent +1 % : écart-type connu, indépendant du hasard
const alternating = (days: number) => Array.from({ length: days }, (_, i) => 100 * (i % 2 === 0 ? 1 : 1.01))

test("historicalVolatility annualise l'écart-type des rendements logarithmiques sur 252 jours", () => {
    const closes = alternating(60)
    const volatility = historicalVolatility(closes)!

    const returns = closes.slice(1).map((close, i) => Math.log(close / closes[i]!))
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const sd = Math.sqrt(returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1))
    expect(volatility).toBeCloseTo(sd * Math.sqrt(252), 10)
})

test("historicalVolatility vaut null sans historique suffisant ou sur une série plate", () => {
    expect(historicalVolatility(alternating(10))).toBeNull()
    expect(historicalVolatility([])).toBeNull()
    expect(historicalVolatility(Array(60).fill(100))).toBeNull()
})


// Série de clôtures aux dates 2026-01-01 + i, rendements journaliers `rets` (log)
const series = (rets: number[], skip: number[] = []): DatedClose[] => {
    let close = 100
    const points = [{ date: new Date(Date.UTC(2026, 0, 1)).toISOString().slice(0, 10), close }]
    rets.forEach((r, i) => {
        close *= Math.exp(r)
        points.push({ date: new Date(Date.UTC(2026, 0, 2 + i)).toISOString().slice(0, 10), close })
    })
    return points.filter((_, i) => !skip.includes(i))
}
const wave = Array.from({ length: 80 }, (_, i) => (i % 7 === 0 ? 0.02 : -0.004 * ((i % 5) + 1)))

test("returnsCorrelation : séries proportionnelles = 1, opposées = -1, diagonale 1 et symétrie", () => {
    const matrix = returnsCorrelation([series(wave), series(wave.map((r) => 2 * r)), series(wave.map((r) => -r))], 60)!

    expect(matrix[0]).toEqual([1, 1, -1])
    expect(matrix[2]).toEqual([-1, -1, 1])
    expect(matrix[1]![2]).toBe(matrix[2]![1]!)
})

test("returnsCorrelation : valeur arrondie à 4 décimales entre séries partiellement liées", () => {
    const noise = wave.map((r, i) => r + (i % 3 === 0 ? 0.01 : -0.005))
    const value = returnsCorrelation([series(wave), series(noise)], 60)![0]![1]!

    expect(value).toBeGreaterThan(0)
    expect(value).toBeLessThan(1)
    expect(value).toBe(round(value, 4))
})

test("returnsCorrelation : seules les dates communes comptent, un rendement n'enjambe pas une date manquante", () => {
    // La série B n'a pas le jour 10 : les rendements se font entre dates communes consécutives pour les deux séries
    const a = series(wave)
    const b = series(wave, [10])
    const full = returnsCorrelation([a, b], 60)
    expect(full).not.toBeNull()
    expect(full![0]![1]).toBeGreaterThan(0.9)

    // Sous le plancher de rendements communs : null
    expect(returnsCorrelation([series(wave.slice(0, 30)), series(wave.slice(0, 30))], 60)).toBeNull()
    // Dates totalement disjointes : aucun rendement commun
    const shifted = series(wave).map((point) => ({ ...point, date: `2027${point.date.slice(4)}` }))
    expect(returnsCorrelation([series(wave), shifted], 60)).toBeNull()
})

test("returnsCorrelation : série plate ou clôture nulle : null, jamais une corrélation inventée", () => {
    expect(returnsCorrelation([series(wave), series(wave.map(() => 0))], 60)).toBeNull()
    expect(returnsCorrelation([series(wave), series(wave).map((p, i) => (i === 5 ? { ...p, close: 0 } : p))], 60)).toBeNull()
    expect(returnsCorrelation([], 60)).toBeNull()
})
