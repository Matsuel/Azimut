"use client"

import { useTranslations } from "next-intl"
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useFormatters } from "@/lib/format"
import { PATH_COLORS } from "./constants"
import type { OptionMonteCarloResult } from "./types"

type TrajectoriesChartProps = {
    result: OptionMonteCarloResult
    strike: number // devise du sous-jacent
    currency: string // devise du sous-jacent (ISO 4217)
}

// Une ligne par jour, une colonne par trajectoire (`p0`, `p1`, …) : la forme que Recharts attend pour tracer plusieurs courbes
function dailyRows(sample: OptionMonteCarloResult["sample"]) {
    return sample[0]!.prices.map((_, day) =>
        Object.fromEntries([["day", day], ...sample.map((path, index) => [`p${index}`, path.prices[day]])]),
    )
}

/** Carte « Trajectoires simulées » (maquette 38) : les trajectoires d'illustration, rouges si la barrière est touchée, avec la barrière et le strike. */
export function TrajectoriesChart({ result, strike, currency }: TrajectoriesChartProps) {
    const f = useFormatters()
    const t = useTranslations("pages.optionMonteCarlo.trajectories")
    const config = {
        active: { label: t("active"), color: PATH_COLORS.active },
        deactivated: { label: t("deactivated"), color: PATH_COLORS.deactivated },
    } satisfies ChartConfig

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>
                    {t("subtitle", { shown: result.sample.length, total: f.formatDecimal1(result.paths) })}
                </CardDescription>
                <CardAction className="flex gap-4 text-small text-muted-foreground">
                    {(["active", "deactivated"] as const).map((key) => (
                        <span key={key} className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: PATH_COLORS[key] }} />
                            {t(key)}
                        </span>
                    ))}
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <ChartContainer config={config} className="aspect-auto h-72 w-full">
                    <LineChart data={dailyRows(result.sample)} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            type="number"
                            dataKey="day"
                            domain={[0, result.steps]}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(day) => t("day", { day })}
                        />
                        <YAxis
                            width={64}
                            tickLine={false}
                            axisLine={false}
                            domain={["auto", "auto"]}
                            tickFormatter={(v) => f.formatWholePrice(v, currency)}
                        />
                        <ReferenceLine y={strike} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                        <ReferenceLine
                            y={result.barrier}
                            stroke={PATH_COLORS.deactivated}
                            strokeDasharray="4 4"
                            label={{ value: t("barrier"), position: "insideTopRight", fontSize: 12 }}
                        />
                        {result.sample.map((path, index) => (
                            <Line
                                // biome-ignore lint/suspicious/noArrayIndexKey: les trajectoires n'ont pas d'identité, leur rang est stable
                                key={index}
                                dataKey={`p${index}`}
                                stroke={path.touched ? PATH_COLORS.deactivated : PATH_COLORS.active}
                                strokeWidth={1.25}
                                strokeOpacity={0.7}
                                dot={false}
                                isAnimationActive={false}
                            />
                        ))}
                    </LineChart>
                </ChartContainer>
                <p className="text-small text-muted-foreground">
                    {t("note", {
                        touched: result.sampleTouched,
                        shown: result.sample.length,
                        strike: f.formatPrice(strike, currency),
                    })}
                </p>
            </CardContent>
        </Card>
    )
}
