"use client"

import { useTranslations } from "next-intl"
import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, XAxis, YAxis } from "recharts"
import { ChartLegend } from "@/components/chart-legend"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BACKTEST_CURRENCY } from "@/features/backtest/constants"
import { type Formatters, useFormatters } from "@/lib/format"
import { PROJECTION_DAYS_PER_YEAR } from "./constants"
import { amountTooltip, chartSeries, endLabel, investedLine, toRow } from "./fan-chart-parts"
import type { ProjectionPoint, ProjectionYear } from "./types"

type ProjectionFanChartProps = {
    points: ProjectionPoint[]
    capital: number
    horizonYears: number
    paths: number
    year: ProjectionYear // fin de l'horizon : étiquettes P10, médiane et P90 et phrase de probabilité
}

/**
 * Éventail des trajectoires (maquette 34) : plages P10–P90 et P25–P75, médiane et montant investi, sur les `points`
 * jusqu'à `horizonYears` (axe X en années). Phrase de probabilité de perte de `year` sous le graphique.
 */
export function ProjectionFanChart({ points, capital, horizonYears, paths, year }: ProjectionFanChartProps) {
    const f = useFormatters()
    const t = useTranslations("pages.projection.chart")
    const horizonDays = horizonYears * PROJECTION_DAYS_PER_YEAR
    const data = points.filter((p) => p.day <= horizonDays).map(toRow)
    const ticks = Array.from({ length: horizonYears + 1 }, (_, i) => i)
    const amount = (value: number) => f.formatWholePrice(value, BACKTEST_CURRENCY)
    const { names, config, legend } = chartSeries(t)
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description", { paths: f.formatDecimal1(paths) })}</CardDescription>
                <ChartLegend series={legend} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <ChartContainer config={config} className="aspect-auto h-82.5 w-full">
                    <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="x"
                            type="number"
                            domain={[0, horizonYears]}
                            ticks={ticks}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(v: number) => (v === 0 ? t("today") : f.formatYears(v))}
                        />
                        <YAxis
                            width={64}
                            tickLine={false}
                            axisLine={false}
                            tickCount={5}
                            domain={["auto", "auto"]}
                            tickFormatter={f.formatAxis}
                        />
                        <ChartTooltip cursor={false} content={amountTooltip(f, names)} />
                        <Area dataKey="band80" stroke="none" fill="var(--color-band80)" isAnimationActive={false} />
                        <Area dataKey="band50" stroke="none" fill="var(--color-band50)" isAnimationActive={false} />
                        <Line
                            dataKey="median"
                            stroke="var(--color-median)"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                        {investedLine(capital, t("investedLabel", { capital: amount(capital) }))}
                        {endLabel(`P90 ${amount(year.p90)}`, year.p90, year.years)}
                        {endLabel(amount(year.p50), year.p50, year.years)}
                        {endLabel(`P10 ${amount(year.p10)}`, year.p10, year.years)}
                    </ComposedChart>
                </ChartContainer>
                <p className="text-small text-muted-foreground">
                    {t("note", { loss: f.formatPercent1(year.lossProbability), horizon: f.formatYears(year.years) })}
                </p>
            </CardContent>
        </Card>
    )
}
