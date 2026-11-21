"use client"

import { useTranslations } from "next-intl"
import { StatCard } from "@/components/stat-card"
import { useFormatters } from "@/lib/format"
import { RATE_CARD_KEYS } from "./constants"
import type { RateCurve } from "./types"

/** Une carte par point de la courbe (maquette 35) : maturité, indice Yahoo, taux annuel tel que reçu et jour de cotation. */
export function RateCards({ curve }: { curve: RateCurve }) {
    const f = useFormatters()
    const t = useTranslations("pages.rates.cards")

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {curve.points.map((point) => {
                const key = RATE_CARD_KEYS[point.symbol as keyof typeof RATE_CARD_KEYS]
                return (
                    <StatCard
                        key={point.symbol}
                        label={key ? t(key) : point.symbol}
                        delta={point.symbol}
                        value={f.formatPercent2(point.rate)}
                        caption={t("caption", { date: f.formatDay(point.date) })}
                    />
                )
            })}
        </div>
    )
}
