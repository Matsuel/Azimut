import { expect, test } from "bun:test"
import { median, round } from "@azimut/utils"

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
