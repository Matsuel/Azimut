"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFormatters } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Risk, RiskReading } from "./types"

// Couleur d'une cellule (maquette 33) : bleu chart-1 si positive, rouge destructive si négative, opacité 10 % à 90 % selon |r|
function cellStyle(correlation: number) {
    const color = correlation < 0 ? "var(--destructive)" : "var(--chart-1)"
    const share = Math.round(10 + 80 * Math.abs(correlation))
    return { backgroundColor: `color-mix(in oklab, ${color} ${share}%, transparent)` }
}

/** Carte « Matrice de corrélation » : grille carrée des corrélations reçues, actifs dans l'ordre de l'allocation. */
export function CorrelationMatrix({ risk, reading }: { risk: Risk; reading: RiskReading }) {
    const f = useFormatters()
    const t = useTranslations("risk.matrix")
    const symbols = risk.assets.map((asset) => asset.symbol)
    const pair = reading.mostCorrelatedPair

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <InfoHint entry="correlation">{t("title")}</InfoHint>
                </CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div
                    className="grid gap-1 overflow-x-auto"
                    style={{ gridTemplateColumns: `3.5rem repeat(${symbols.length}, minmax(3rem, 1fr))` }}
                >
                    <span />
                    {symbols.map((symbol) => (
                        <span key={symbol} className="text-center text-small-medium text-muted-foreground">
                            {symbol}
                        </span>
                    ))}
                    {risk.correlations.map((row, i) => (
                        <MatrixRow key={symbols[i]} symbol={symbols[i] ?? ""} row={row} format={f.formatCorrelation} />
                    ))}
                </div>
                {pair && (
                    <p className="text-small text-muted-foreground">
                        {t("reading", { ...pair, correlation: f.formatCorrelation(pair.correlation) })}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

function MatrixRow({ symbol, row, format }: { symbol: string; row: number[]; format: (v: number) => string }) {
    return (
        <>
            <span className="self-center text-small-medium text-muted-foreground">{symbol}</span>
            {row.map((value, j) => (
                <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: colonne fixe de la matrice
                    key={j}
                    style={cellStyle(value)}
                    className={cn(
                        "flex h-11 items-center justify-center rounded-sm text-body-medium",
                        // Texte blanc sur fond soutenu, dans les deux thèmes (comme le badge `destructive`)
                        Math.abs(value) >= 0.5 && "text-white",
                    )}
                >
                    {format(value)}
                </span>
            ))}
        </>
    )
}
