"use client"

import { useTranslations } from "next-intl"
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useFormatters } from "@/lib/format"
import type { OptionMonteCarloResult } from "./types"

// Bande ± 2 erreurs standard autour du prix : seule la légende « ± 2 ES » en fixe le facteur
const BAND_STD_ERRORS = 2

type ConvergenceChartProps = {
    result: OptionMonteCarloResult
    currency: string // devise du sous-jacent (ISO 4217)
}

/** Carte « Convergence du prix » (maquette 38) : prix Monte Carlo du call vanille selon le nombre de trajectoires, bande ± 2 ES et repère Black-Scholes. */
export function ConvergenceChart({ result, currency }: ConvergenceChartProps) {
    const f = useFormatters()
    const t = useTranslations("pages.optionMonteCarlo.convergence")
    const config = {
        price: { label: t("monteCarlo"), color: "var(--chart-1)" },
        band: { label: t("band"), color: "var(--chart-1)" },
    } satisfies ChartConfig
    const rows = result.convergence.map((point) => ({
        paths: point.paths,
        price: point.price,
        band: [
            point.price - BAND_STD_ERRORS * point.standardError,
            point.price + BAND_STD_ERRORS * point.standardError,
        ],
    }))

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("subtitle")}</CardDescription>
                <CardAction className="flex gap-4 text-small text-muted-foreground">
                    <span>{t("monteCarlo")}</span>
                    <span>{t("band")}</span>
                    <span>{t("blackScholes")}</span>
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <ChartContainer config={config} className="aspect-auto h-64 w-full">
                    <ComposedChart data={rows} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="paths"
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(paths) => f.formatDecimal1(paths)}
                        />
                        <YAxis
                            width={64}
                            tickLine={false}
                            axisLine={false}
                            domain={["auto", "auto"]}
                            tickFormatter={(v) => f.formatWholePrice(v, currency)}
                        />
                        <Area
                            dataKey="band"
                            fill="var(--color-band)"
                            fillOpacity={0.15}
                            stroke="none"
                            isAnimationActive={false}
                        />
                        <ReferenceLine
                            y={result.blackScholesPrice}
                            stroke="var(--muted-foreground)"
                            strokeDasharray="4 4"
                        />
                        <Line
                            dataKey="price"
                            stroke="var(--color-price)"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                </ChartContainer>
                <p className="text-small text-muted-foreground">{t("note")}</p>
            </CardContent>
        </Card>
    )
}
