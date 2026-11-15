import { expect, test } from "bun:test"
import {
    API_ERROR_CODES,
    API_ERROR_MESSAGES,
    allocationsSchema,
    backtestCompletedEventSchema,
    riskCompletedEventSchema,
    riskConstraintInputSchema,
} from "../src"

test("allocationsSchema : poids au pourcent près, somme 1, symboles uniques", () => {
    expect(allocationsSchema.safeParse([{ symbol: "A", weight: 0.6 }, { symbol: "B", weight: 0.4 }]).success).toBe(true)
    expect(allocationsSchema.safeParse([{ symbol: "A", weight: 0.6 }, { symbol: "B", weight: 0.3 }]).success).toBe(false)
    expect(allocationsSchema.safeParse([{ symbol: "A", weight: 0.5 }, { symbol: "A", weight: 0.5 }]).success).toBe(false)
    expect(allocationsSchema.safeParse([{ symbol: "A", weight: 0.555 }, { symbol: "B", weight: 0.445 }]).success).toBe(false)
})

test("riskConstraintInputSchema : ratio de 0,01 à 0,99 au pourcent près (D9)", () => {
    for (const limit of [0.01, 0.15, 0.99]) expect(riskConstraintInputSchema.safeParse({ maxDrawdownLimit: limit }).success).toBe(true)
    for (const limit of [0, 0.005, 0.155, 1, "0.15", null])
        expect(riskConstraintInputSchema.safeParse({ maxDrawdownLimit: limit }).success).toBe(false)
})

const envelope = (payload: object) => ({ eventId: "e", eventType: "t", occurredAt: "2024-01-01T00:00:00.000Z", version: 1, payload })

test("risk.completed : risk null accepté (données insuffisantes), risque partiel refusé", () => {
    expect(riskCompletedEventSchema.safeParse(envelope({ executionId: "x", finishedAt: "2024-01-01T00:00:00.000Z", risk: null })).success).toBe(true)
    expect(
        riskCompletedEventSchema.safeParse(envelope({ executionId: "x", finishedAt: "2024-01-01T00:00:00.000Z", risk: { var95: -0.02 } })).success,
    ).toBe(false)
})

test("backtest.completed exige la recopie `request` destinée à risk-engine", () => {
    const parsed = backtestCompletedEventSchema.safeParse(envelope({ executionId: "x" }))
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues.some((issue) => issue.path.includes("request"))).toBe(true)
})

test("chaque code d'erreur a son message anglais", () => {
    for (const code of Object.values(API_ERROR_CODES)) expect(API_ERROR_MESSAGES[code]).toBeTruthy()
})
