"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { StatCard } from "@/components/stat-card"
import { BACKTEST_CURRENCY } from "@/features/backtest/constants"
import { useFormatters } from "@/lib/format"
import type { ProjectionYear } from "./types"

/** Quatre cartes de la maquette 34 pour l'horizon `year.years` : P50, P10, P90 (EUR) et probabilité de perte (ratio). */
export function ProjectionStats({ year, capital }: { year: ProjectionYear; capital: number }) {
    const f = useFormatters()
    const t = useTranslations("pages.projection.stats")
    const horizon = f.formatYears(year.years)
    const amount = (value: number) => f.formatWholePrice(value, BACKTEST_CURRENCY)

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
                label={<InfoHint entry="projectionPercentile">{t("median", { horizon })}</InfoHint>}
                delta={t("p50")}
                value={amount(year.p50)}
                caption={t("medianCaption", { capital: amount(capital) })}
            />
            <StatCard
                label={t("pessimistic")}
                delta={t("p10")}
                value={amount(year.p10)}
                caption={t("pessimisticCaption")}
            />
            <StatCard
                label={t("optimistic")}
                delta={t("p90")}
                value={amount(year.p90)}
                caption={t("optimisticCaption")}
            />
            <StatCard
                label={<InfoHint entry="projectionLossProbability">{t("loss")}</InfoHint>}
                delta={horizon}
                value={f.formatPercent1(year.lossProbability)}
                caption={t("lossCaption")}
            />
        </div>
    )
}
