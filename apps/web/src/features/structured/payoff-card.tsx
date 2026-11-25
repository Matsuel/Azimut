"use client"

import { useTranslations } from "next-intl"
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useFormatters } from "@/lib/format"
import { PAYOFF_COLORS, STRUCTURED_CURRENCY } from "./constants"
import { useStructuredNotes } from "./notes"
import type { StructuredInput, StructuredResult } from "./types"
import { payoffRows } from "./utils"

const config = {
    payoff: { color: PAYOFF_COLORS.product },
    underlying: { color: PAYOFF_COLORS.underlying },
} satisfies ChartConfig

// Courbes du montant reçu et du sous-jacent détenu en direct, sur l'axe des variations du sous-jacent
function PayoffPlot({ result, input }: { result: StructuredResult; input: StructuredInput }) {
    const f = useFormatters()

    return (
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
            <LineChart
                data={payoffRows(result.payoff, input.nominal)}
                margin={{ top: 16, right: 16, bottom: 0, left: 0 }}
            >
                <CartesianGrid vertical={false} />
                <XAxis
                    type="number"
                    dataKey="underlyingChange"
                    domain={["dataMin", "dataMax"]}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(change) => f.formatChange(change * 100)}
                />
                <YAxis
                    width={64}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => f.formatWholePrice(v, STRUCTURED_CURRENCY)}
                />
                <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                <Line
                    dataKey="underlying"
                    stroke={PAYOFF_COLORS.underlying}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                />
                <Line
                    dataKey="payoff"
                    stroke={PAYOFF_COLORS.product}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>
        </ChartContainer>
    )
}

/** Carte « Payoff à l'échéance » (maquette 39) : montant reçu pour le nominal selon la variation du sous-jacent, face au sous-jacent détenu en direct (pointillés). */
export function PayoffCard({ result, input }: { result: StructuredResult; input: StructuredInput }) {
    const f = useFormatters()
    const t = useTranslations("pages.structured")
    const notes = useStructuredNotes()

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("payoff.title")}</CardTitle>
                <CardDescription>
                    {t("payoff.subtitle", { nominal: f.formatPrice(input.nominal, STRUCTURED_CURRENCY) })}
                </CardDescription>
                <CardAction className="flex gap-4 text-small text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: PAYOFF_COLORS.product }} />
                        {t(`products.${result.product}`)}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-0.5 w-3" style={{ backgroundColor: PAYOFF_COLORS.underlying }} />
                        {t("payoff.underlying")}
                    </span>
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <PayoffPlot result={result} input={input} />
                <p className="text-small text-muted-foreground">{notes.payoff(result, input)}</p>
            </CardContent>
        </Card>
    )
}
