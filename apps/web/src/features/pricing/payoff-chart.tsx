"use client"

import { useTranslations } from "next-intl"
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from "recharts"
import { InfoHint } from "@/components/info-hint"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useFormatters } from "@/lib/format"
import type { OptionResult } from "./types"

type PayoffChartProps = {
    result: OptionResult
    strike: number // devise du sous-jacent
    currency: string // devise du sous-jacent (ISO 4217)
}

// Call en bleu, put en orange : mêmes couleurs que la légende de la maquette 36
const COLORS = { callNet: "var(--chart-1)", putNet: "var(--warning)" } as const
// Série du graphique → clé de libellé (`pages.options.chart.<clé>`)
const SIDE_KEYS = { callNet: "call", putNet: "put" } as const
const config = { callNet: { color: COLORS.callNet }, putNet: { color: COLORS.putNet } } satisfies ChartConfig

/** Carte « Gain ou perte à l'échéance » (maquette 36) : résultat net d'un achat de call et de put selon le cours final, strike et points morts marqués. */
export function PayoffChart({ result, strike, currency }: PayoffChartProps) {
    const f = useFormatters()
    const t = useTranslations("pages.options.chart")

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("subtitle")}</CardDescription>
                <CardAction className="flex gap-4 text-small text-muted-foreground">
                    {(["callNet", "putNet"] as const).map((key) => (
                        <span key={key} className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[key] }} />
                            {t(SIDE_KEYS[key])}
                        </span>
                    ))}
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <PayoffPlot result={result} strike={strike} currency={currency} />
                <p className="text-small text-muted-foreground">
                    <InfoHint entry="optionBreakEven">
                        {t("note", {
                            call: f.formatPrice(result.call.breakEven, currency),
                            put: f.formatPrice(result.put.breakEven, currency),
                        })}
                    </InfoHint>
                </p>
            </CardContent>
        </Card>
    )
}

// Courbes du résultat net sur l'axe des cours finaux, strike en pointillés et points morts sur la ligne zéro
function PayoffPlot({ result, strike, currency }: PayoffChartProps) {
    const f = useFormatters()
    const t = useTranslations("pages.options.chart")
    const breakEvens = { callNet: result.call.breakEven, putNet: result.put.breakEven }

    return (
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
            <LineChart data={result.payoffGrid} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                    type="number"
                    dataKey="spot"
                    domain={["dataMin", "dataMax"]}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={f.formatAxis}
                />
                <YAxis
                    width={64}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => f.formatWholePrice(v, currency)}
                />
                <ReferenceLine y={0} stroke="var(--border)" />
                <ReferenceLine
                    x={strike}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    label={{
                        value: t("strike", { value: f.formatPrice(strike, currency) }),
                        position: "insideTopRight",
                        fontSize: 12,
                        fill: "var(--muted-foreground)",
                    }}
                />
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            hideIndicator
                            labelFormatter={(_, payload) => f.formatPrice(Number(payload?.[0]?.payload.spot), currency)}
                            formatter={(value, name) => (
                                <span className="text-body-medium">
                                    {t(SIDE_KEYS[name as keyof typeof SIDE_KEYS])}{" "}
                                    {f.formatPrice(Number(value), currency)}
                                </span>
                            )}
                        />
                    }
                />
                {(Object.keys(SIDE_KEYS) as (keyof typeof SIDE_KEYS)[]).map((key) => (
                    <Line
                        key={key}
                        dataKey={key}
                        stroke={COLORS[key]}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                ))}
                {(Object.keys(SIDE_KEYS) as (keyof typeof SIDE_KEYS)[]).map((key) => (
                    <ReferenceDot key={key} x={breakEvens[key]} y={0} r={4} fill={COLORS[key]} stroke="none" />
                ))}
            </LineChart>
        </ChartContainer>
    )
}
