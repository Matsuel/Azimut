import { ReferenceDot, ReferenceLine } from "recharts"
import { referenceSeries } from "@/components/area-series-chart"
import { type ChartConfig, ChartTooltipContent } from "@/components/ui/chart"
import { formatWholeAmount } from "@/features/backtest/utils"
import type { Formatters } from "@/lib/format"
import type { ProjectionPoint } from "./types"

export const COLORS = {
    median: "var(--chart-1)",
    band50: "color-mix(in oklab, var(--chart-1) 35%, transparent)",
    band80: "color-mix(in oklab, var(--chart-1) 15%, transparent)",
}

// Une ligne par point : `x` en années (jour / jours par année), plages `[bas, haut]` pour les `Area`
export const toRow = (p: ProjectionPoint, daysPerYear: number) => ({
    x: p.day / daysPerYear,
    median: p.p50,
    band50: [p.p25, p.p75],
    band80: [p.p10, p.p90],
})

export function endLabel(text: string, y: number, x: number) {
    return (
        <ReferenceDot
            key={text}
            x={x}
            y={y}
            r={4}
            fill="var(--chart-1)"
            stroke="none"
            label={{ value: text, position: "left", fill: "var(--foreground)", fontSize: 12 }}
        />
    )
}

export const amountTooltip = (f: Formatters, names: Record<string, string>) => (
    <ChartTooltipContent
        labelFormatter={(_, payload) => (payload?.[0] ? f.formatYears(payload[0].payload.x) : "")}
        formatter={(value, name) => {
            const range = Array.isArray(value)
            const text = range
                ? `${formatWholeAmount(f, Number(value[0]))} – ${formatWholeAmount(f, Number(value[1]))}`
                : formatWholeAmount(f, Number(value))
            return (
                <span className="text-body-medium">
                    {names[String(name)]} : {text}
                </span>
            )
        }}
    />
)

/** Noms, configuration recharts et légende des séries de l'éventail, libellés tirés de `pages.projection.chart`. */
export function chartSeries(t: (key: "median" | "band50" | "band80" | "invested") => string) {
    const names = { median: t("median"), band50: t("band50"), band80: t("band80") }
    const config = {
        median: { label: names.median, color: COLORS.median },
        band50: { label: names.band50, color: COLORS.band50 },
        band80: { label: names.band80, color: COLORS.band80 },
    } satisfies ChartConfig
    const legend = [
        { key: "median", label: names.median, color: COLORS.median },
        { key: "band50", label: names.band50, color: COLORS.band50 },
        { key: "band80", label: names.band80, color: COLORS.band80 },
        referenceSeries({ key: "invested", label: t("invested") }),
    ]
    return { names, config, legend }
}

/** Ligne pointillée au capital de départ, étiquetée `label` (EUR formaté par l'appelant). */
export const investedLine = (capital: number, label: string) => (
    <ReferenceLine
        y={capital}
        stroke="var(--muted-foreground)"
        strokeDasharray="4 4"
        label={{ value: label, position: "insideBottomRight", fill: "var(--muted-foreground)", fontSize: 12 }}
    />
)
