"use client"

import { useTranslations } from "next-intl"
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useFormatters } from "@/lib/format"
import { OPTION_DEFAULT_CURRENCY, SMILE_COLORS } from "./constants"
import type { OptionChainResult } from "./types"

// Une ligne par strike, une colonne par échéance (`e0`, `e1`, …) : la forme que Recharts attend pour tracer plusieurs courbes
function smileRows(smile: OptionChainResult["smile"]) {
    const rows = new Map<number, Record<string, number>>()
    smile.forEach((curve, index) => {
        for (const point of curve.points) {
            rows.set(point.strike, {
                ...rows.get(point.strike),
                strike: point.strike,
                [`e${index}`]: point.impliedVolatility,
            })
        }
    })
    return [...rows.values()].sort((a, b) => a.strike! - b.strike!)
}

// Une entrée par échéance (`e0`, `e1`, …) : libellé = jour d'échéance, couleur de `SMILE_COLORS`
function smileConfig(smile: OptionChainResult["smile"], f: ReturnType<typeof useFormatters>): ChartConfig {
    return Object.fromEntries(
        smile.map((curve, index) => [
            `e${index}`,
            { label: f.formatDay(curve.expiration), color: SMILE_COLORS[index] },
        ]),
    )
}

/** Carte « Smile de volatilité » (maquette 37) : volatilité implicite selon le strike, une courbe par échéance, repère du spot. */
export function SmileChart({ chain }: { chain: OptionChainResult }) {
    const f = useFormatters()
    const t = useTranslations("pages.optionChain.smile")

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("subtitle")}</CardDescription>
                <CardAction>
                    <ul className="flex flex-wrap gap-4 text-small text-muted-foreground">
                        {chain.smile.map((curve, index) => (
                            <li key={curve.expiration} className="flex items-center gap-1.5">
                                <span
                                    aria-hidden
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: SMILE_COLORS[index] }}
                                />
                                {f.formatDay(curve.expiration)}
                            </li>
                        ))}
                    </ul>
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <SmilePlot chain={chain} />
                <p className="text-small text-muted-foreground">{t("note")}</p>
            </CardContent>
        </Card>
    )
}

// Courbes de volatilité implicite selon le strike, une par échéance, avec le repère du spot
function SmilePlot({ chain }: { chain: OptionChainResult }) {
    const f = useFormatters()
    const t = useTranslations("pages.optionChain.smile")
    const config = smileConfig(chain.smile, f)

    return (
        <ChartContainer config={config} className="aspect-auto h-72 w-full">
            <LineChart data={smileRows(chain.smile)} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                    type="number"
                    dataKey="strike"
                    domain={["dataMin", "dataMax"]}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    width={48}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                    tickFormatter={f.formatRate}
                />
                <ReferenceLine
                    x={chain.spot}
                    strokeDasharray="4 4"
                    label={{
                        value: t("spot", { spot: f.formatPrice(chain.spot, OPTION_DEFAULT_CURRENCY) }),
                        position: "top",
                        fontSize: 12,
                    }}
                />
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            labelFormatter={(_, payload) =>
                                t("strike", { strike: String(payload?.[0]?.payload.strike) })
                            }
                            formatter={(value) => (
                                <span className="text-body-medium">{f.formatPercent1(Number(value))}</span>
                            )}
                        />
                    }
                />
                {chain.smile.map((curve, index) => (
                    <Line
                        key={curve.expiration}
                        dataKey={`e${index}`}
                        stroke={`var(--color-e${index})`}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                        isAnimationActive={false}
                    />
                ))}
            </LineChart>
        </ChartContainer>
    )
}
