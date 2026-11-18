import { expect, test } from "bun:test"
import { fxPairSymbol, rateOn } from "../src"

const rates = [
    { date: "2024-01-02", close: 1.1 },
    { date: "2024-01-03", close: 1.2 },
    { date: "2024-01-05", close: 1.3 },
]

test("fxPairSymbol : paire yahoo qui cote 1 € dans la devise", () => {
    expect(fxPairSymbol("USD")).toBe("EURUSD=X")
})

test.each([
    ["2024-01-03", 1.2],
    ["2024-01-04", 1.2],
    ["2024-01-10", 1.3],
    ["2023-12-30", 1.1],
])("rateOn(%s) : dernier taux connu à la date, ou le premier avant la série", (date, expected) => {
    expect(rateOn(rates, date)).toBe(expected)
})
