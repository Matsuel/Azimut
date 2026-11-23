import { expect, test } from "bun:test"
import {
    API_ERROR_CODES,
    API_ERROR_MESSAGES,
    allocationsSchema,
    monitoringServicesResponseSchema,
    readinessResponseSchema,
    backtestCompletedEventSchema,
    notificationRequestedPayloadSchema,
    riskCompletedEventSchema,
    optionInputsSchema,
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

const notif = { userId: "u", dedupKey: "k", occurredAt: "2024-01-01T00:00:00.000Z" }
const ref = { backtestId: "b", name: "N" }

test("notification.requested : un payload par type accepté, type inconnu ou paramètre manquant refusé", () => {
    const valid = [
        { type: "BACKTEST_COMPLETED", params: { ...ref, cagr: 0.1, sharpe: 1.2, maxDrawdown: 0.2 } },
        { type: "BACKTEST_FAILED", params: { ...ref, errorCode: null } },
        { type: "RISK_CONSTRAINT_VIOLATED", params: { ...ref, maxDrawdown: 0.3, limit: 0.15 } },
        { type: "PROJECTION_COMPLETED", params: { ...ref, scenarios: 1000, lossProbability: 0.2 } },
    ]
    for (const v of valid) expect(notificationRequestedPayloadSchema.safeParse({ ...notif, ...v }).success).toBe(true)
    expect(notificationRequestedPayloadSchema.safeParse({ ...notif, type: "OTHER", params: ref }).success).toBe(false)
    expect(notificationRequestedPayloadSchema.safeParse({ ...notif, type: "BACKTEST_COMPLETED", params: ref }).success).toBe(false)
})

test("readiness : checks partiels acceptés, valeur de dépendance inconnue refusée", () => {
    expect(readinessResponseSchema.safeParse({ status: "ok", checks: {} }).success).toBe(true)
    expect(readinessResponseSchema.safeParse({ status: "unavailable", checks: { database: "ok", kafka: "down" } }).success).toBe(true)
    expect(readinessResponseSchema.safeParse({ status: "ok", checks: { provider: "slow" } }).success).toBe(false)
    expect(readinessResponseSchema.safeParse({ status: "degraded", checks: {} }).success).toBe(false)
})

test("monitoring : ligne down sans checks ni latence, service inconnu refusé", () => {
    const summary = { total: 1, up: 0, degraded: 0, down: 1, downServices: ["risk-engine"] }
    const down = { service: "risk-engine", state: "down", latencyMs: null, checkedAt: "2026-11-19T10:00:00.000Z" }
    expect(monitoringServicesResponseSchema.safeParse({ services: [down], summary }).success).toBe(true)
    expect(monitoringServicesResponseSchema.safeParse({ services: [{ ...down, service: "gateway" }], summary }).success).toBe(false)
})

test("optionInputsSchema : volatilité null acceptée (historique trop court), spot nul ou volatilité nulle refusés", () => {
    const base = { symbol: "AAPL", currency: "USD", spot: 224.4, dividendYield: 0, volatility: 0.243 }
    expect(optionInputsSchema.safeParse(base).success).toBe(true)
    expect(optionInputsSchema.safeParse({ ...base, volatility: null }).success).toBe(true)
    expect(optionInputsSchema.safeParse({ ...base, spot: 0 }).success).toBe(false)
    expect(optionInputsSchema.safeParse({ ...base, volatility: 0 }).success).toBe(false)
})
