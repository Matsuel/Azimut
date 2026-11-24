import { expect, test } from "bun:test"
import { historicalVolatility, median, round } from "@azimut/utils"

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

