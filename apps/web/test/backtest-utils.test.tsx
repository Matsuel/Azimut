import { expect, test } from "bun:test"
import { renderHook } from "@testing-library/react"
import { createTranslator, NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import fr from "../messages/fr.json"
import type { Backtest, BacktestComparison, BacktestExecution, EquityPoint } from "../src/features/backtest/types"
import {
    alignCurves,
    allocationTotal,
    type BacktestTranslator,
    formatRecovery,
    fromDecimal,
    getComparisonBenchmark,
    getExecutionDuration,
    hasStatus,
    yearsBetween,
} from "../src/features/backtest/utils"
import { useFormatters } from "../src/lib/format"

const t = createTranslator({ locale: "fr", messages: fr, namespace: "backtest" }) as unknown as BacktestTranslator
const wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale="fr" messages={fr}>
        {children}
    </NextIntlClientProvider>
)
const f = renderHook(() => useFormatters(), { wrapper }).result.current

test("allocationTotal : somme des poids en pourcent, un poids vidé compte 0", () => {
    expect(allocationTotal([{ weight: 60 }, { weight: Number.NaN }, { weight: 40 }] as never)).toBe(100)
})

test("hasStatus : statut de la dernière exécution parmi ceux demandés, faux sans exécution", () => {
    const backtest = (statuses: string[]) =>
        ({ executions: statuses.map((status) => ({ status })) }) as unknown as Backtest

    expect(hasStatus(backtest(["FAILED", "COMPLETED"]), ["FAILED"])).toBe(true)
    expect(hasStatus(backtest(["COMPLETED", "FAILED"]), ["FAILED"])).toBe(false)
    expect(hasStatus(backtest([]), ["FAILED"])).toBe(false)
})

test("getExecutionDuration : depuis le démarrage (sinon la création), au moins 1 s, null tant qu'elle tourne", () => {
    const execution = (e: Partial<BacktestExecution>) =>
        ({ createdAt: "2024-01-01T10:00:00.000Z", startedAt: null, finishedAt: null, ...e }) as BacktestExecution

    expect(getExecutionDuration(t, execution({}))).toBeNull()
    expect(
        getExecutionDuration(
            t,
            execution({ startedAt: "2024-01-01T10:00:10.000Z", finishedAt: "2024-01-01T10:01:15.000Z" }),
        ),
    ).toBe("1 min 5 s")
    expect(getExecutionDuration(t, execution({ finishedAt: "2024-01-01T10:00:00.200Z" }))).toBe("1 s")
})

test("fromDecimal : Decimal sérialisé en nombre, null ou absent → null", () => {
    expect(fromDecimal("0.0725")).toBe(0.0725)
    expect(fromDecimal(null)).toBeNull()
    expect(fromDecimal(undefined)).toBeNull()
})

test("formatRecovery : durée si récupérée, « Aucune baisse », « Non récupéré » si le plus haut est daté, sinon null", () => {
    expect(formatRecovery(f, t, 30, -0.1, true)).toBe(f.formatDuration(30))
    expect(formatRecovery(f, t, null, 0, false)).toBe("Aucune baisse")
    expect(formatRecovery(f, t, null, -0.1, true)).toBe("Non récupéré")
    expect(formatRecovery(f, t, null, -0.1, false)).toBeNull()
    expect(formatRecovery(f, t, undefined, null, true)).toBeNull()
})

test("getComparisonBenchmark : celui de A, sinon celui de B, null si aucun", () => {
    const comparison = (a: string | null, b: string | null) =>
        ({ a: { result: { benchmark: a } }, b: { result: { benchmark: b } } }) as unknown as BacktestComparison

    expect(getComparisonBenchmark(comparison("URTH", "SPY"))).toEqual({ side: "a", benchmark: "URTH" } as never)
    expect(getComparisonBenchmark(comparison(null, "SPY"))).toEqual({ side: "b", benchmark: "SPY" } as never)
    expect(getComparisonBenchmark(comparison(null, null))).toEqual({ side: "a", benchmark: null } as never)
})

test("alignCurves : union triée des dates, côté absent hors période, benchmark du côté demandé", () => {
    const a = [
        { date: "2024-01-03", value: 110, benchmarkValue: 105 },
        { date: "2024-01-02", value: 100, benchmarkValue: 100 },
    ] as EquityPoint[]
    const b = [{ date: "2024-01-04", value: 90, benchmarkValue: 95 }] as EquityPoint[]

    expect(alignCurves(a, b, (p) => p.value, "a")).toEqual([
        { date: "2024-01-02", a: 100, benchmark: 100 },
        { date: "2024-01-03", a: 110, benchmark: 105 },
        { date: "2024-01-04", b: 90 },
    ])
})

test("yearsBetween : années de 365,25 jours", () => {
    expect(yearsBetween("2020-01-01", "2024-01-01")).toBeCloseTo(4, 2)
})
