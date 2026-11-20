"use client"

import { useTranslations } from "next-intl"
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useFormatters } from "@/lib/format"
import type { RateCurve } from "./types"

// Point d'un taux de courbe interpolé à la maturité de l'obligation (résultat à taux de courbe)
export type InterpolatedRate = { maturityYears: number; rate: number }

const config = { rate: { label: "", color: "var(--chart-1)" } } satisfies ChartConfig

/** Carte « Courbe des taux US » (maquette 35) : taux selon la maturité, plus le taux interpolé de l'obligation s'il y en a un. */
export function RateCurveChart({ curve, interpolated }: { curve: RateCurve; interpolated?: InterpolatedRate }) {
    const t = useTranslations("pages.rates.curve")

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("subtitle", { count: curve.points.length })}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <CurvePlot curve={curve} interpolated={interpolated} />
                <CurveLegend interpolated={interpolated} />
                <p className="text-small text-muted-foreground">{t("note")}</p>
            </CardContent>
        </Card>
    )
}

// Courbe des points de marché sur un axe de maturités en années, et point du taux interpolé
function CurvePlot({ curve, interpolated }: { curve: RateCurve; interpolated?: InterpolatedRate }) {
    const f = useFormatters()
    const t = useTranslations("pages.rates.curve")
    // Maturité sous un an en mois (« 3 m »), au-delà en années
    const tick = (years: number) => (years < 1 ? t("months", { count: Math.round(years * 12) }) : f.formatYears(years))
    const maxMaturity = Math.max(...curve.points.map((p) => p.maturityYears))

    return (
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
            <LineChart data={curve.points} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                    type="number"
                    dataKey="maturityYears"
                    domain={[0, maxMaturity]}
                    ticks={curve.points.map((p) => p.maturityYears)}
                    tickFormatter={tick}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    width={56}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                    tickFormatter={f.formatPercent1}
                />
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            hideIndicator
                            labelFormatter={(_, payload) => tick(Number(payload?.[0]?.payload.maturityYears))}
                            formatter={(value) => (
                                <span className="text-body-medium">{f.formatPercent2(Number(value))}</span>
                            )}
                        />
                    }
                />
                <Line
                    dataKey="rate"
                    stroke="var(--color-rate)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    isAnimationActive={false}
                />
                {interpolated && (
                    <ReferenceDot
                        x={interpolated.maturityYears}
                        y={interpolated.rate}
                        r={5}
                        fill="var(--chart-3)"
                        stroke="none"
                    />
                )}
            </LineChart>
        </ChartContainer>
    )
}

// Légende sous le graphique : points de marché, et taux interpolé quand le résultat en a un
function CurveLegend({ interpolated }: { interpolated?: InterpolatedRate }) {
    const f = useFormatters()
    const t = useTranslations("pages.rates.curve")

    return (
        <div className="flex gap-4 text-small text-muted-foreground">
            <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-chart-1" />
                {t("market")}
            </span>
            {interpolated && (
                <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-chart-3" />
                    {t("interpolated", {
                        maturity: f.formatYears(interpolated.maturityYears),
                        rate: f.formatPercent2(interpolated.rate),
                    })}
                </span>
            )}
        </div>
    )
}
