"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { useFormatters } from "@/lib/format"
import type { RateCurve } from "./types"

// Point d'un taux de courbe interpolé à la maturité de l'obligation (résultat à taux de courbe)
export type InterpolatedRate = { maturityYears: number; rate: number }

// Légende sous le graphique : points de marché, et taux interpolé quand le résultat en a un
export function CurveLegend({ interpolated }: { interpolated?: InterpolatedRate }) {
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
                    <InfoHint entry="interpolatedRate">
                        {t("interpolated", {
                            maturity: f.formatYears(interpolated.maturityYears),
                            rate: f.formatPercent2(interpolated.rate),
                        })}
                    </InfoHint>
                </span>
            )}
        </div>
    )
}

type PointLabelProps = {
    x?: number | string
    y?: number | string
    value?: number | string
    index?: number
    points: RateCurve["points"]
}

// Valeur d'un point de la courbe : au-dessus du point, sous lui quand c'est un creux (la ligne passerait sur le texte)
export function PointLabel({ x = 0, y = 0, index = 0, points }: PointLabelProps) {
    const f = useFormatters()
    const rate = points[index]?.rate ?? 0
    const trough =
        index > 0 && index < points.length - 1 && rate < points[index - 1]!.rate && rate < points[index + 1]!.rate

    return (
        <text
            x={Number(x)}
            y={Number(y) + (trough ? 22 : -10)}
            textAnchor="middle"
            fontSize={12}
            fill="var(--foreground)"
        >
            {f.formatPercent2(rate)}
        </text>
    )
}
