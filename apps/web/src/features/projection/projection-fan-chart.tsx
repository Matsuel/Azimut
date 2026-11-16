"use client"

import { useTranslations } from "next-intl"
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"
import { ChartLegend } from "@/components/chart-legend"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { formatWholeAmount } from "@/features/backtest/utils"
import { useFormatters } from "@/lib/format"
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
    const daysPerYear = year.day / year.years // lu des données, pas écrit en dur
    const data = points.filter((p) => p.day <= year.day).map((p) => toRow(p, daysPerYear))
    // Une graduation par an jusqu'à 10 ans, puis tous les 5 ans : 31 libellés ne tiennent pas sur l'axe
    const tickStep = horizonYears > 10 ? 5 : 1
    const ticks = Array.from({ length: horizonYears + 1 }, (_, i) => i).filter((i) => i % tickStep === 0)
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
                        {investedLine(capital, t("investedLabel", { capital: formatWholeAmount(f, capital) }))}
                        {endLabel(`P90 ${formatWholeAmount(f, year.p90)}`, year.p90, year.years)}
                        {endLabel(formatWholeAmount(f, year.p50), year.p50, year.years)}
                        {endLabel(`P10 ${formatWholeAmount(f, year.p10)}`, year.p10, year.years)}
                    </ComposedChart>
                </ChartContainer>
                <p className="text-small text-muted-foreground">
                    {t("note", { loss: f.formatPercent1(year.lossProbability), horizon: f.formatYears(year.years) })}
                </p>
            </CardContent>
        </Card>
    )
}
