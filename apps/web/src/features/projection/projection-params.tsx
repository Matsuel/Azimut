"use client"

import { useTranslations } from "next-intl"
import { DetailRow } from "@/components/detail-row"
import { FilterTabs } from "@/components/filter-tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BACKTEST_CURRENCY } from "@/features/backtest/constants"
import { useFormatters } from "@/lib/format"
import { HORIZON_YEARS } from "./constants"
import type { Projection } from "./types"

type ProjectionParamsProps = { projection: Projection; horizon: number; onHorizonChange: (horizon: number) => void }

/**
 * Carte « Paramètres de la projection » : choix de l'horizon (état d'interface, sans requête) et hypothèses fixes
 * en lecture seule (capital, scénarios, seed, blocs effectifs, historique utilisé).
 */
export function ProjectionParams({ projection, horizon, onHorizonChange }: ProjectionParamsProps) {
    const f = useFormatters()
    const t = useTranslations("pages.projection.params")
    const options = HORIZON_YEARS.map((years) => ({ value: String(years), label: f.formatYears(years) }))

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <span className="text-small-medium">{t("horizon")}</span>
                    <FilterTabs
                        className="w-full"
                        value={String(horizon)}
                        onChange={(value) => onHorizonChange(Number(value))}
                        options={options}
                    />
                </div>
                <dl className="flex flex-col gap-4 text-body">
                    <DetailRow label={t("invested")}>
                        {f.formatWholePrice(projection.capital, BACKTEST_CURRENCY)}
                    </DetailRow>
                    <DetailRow label={t("paths")}>{f.formatDecimal1(projection.paths)}</DetailRow>
                    <DetailRow label={t("seed")}>{projection.seed}</DetailRow>
                    <DetailRow label={t("blockSize")}>{t("blockDays", { count: projection.blockDays })}</DetailRow>
                    <DetailRow label={t("history")}>
                        {t("historyValue", {
                            period: f.formatDayRange(projection.historyStart, projection.historyEnd),
                            days: projection.historyDays,
                        })}
                    </DetailRow>
                </dl>
            </CardContent>
        </Card>
    )
}
