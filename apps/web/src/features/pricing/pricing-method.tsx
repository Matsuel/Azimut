"use client"

import { useTranslations } from "next-intl"
import { Dash } from "@/components/dash"
import { DetailRow } from "@/components/detail-row"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFormatters } from "@/lib/format"
import type { BondResult, RateCurve } from "./types"

type PricingMethodProps = { curve: RateCurve; bond: BondResult | null }

/** Carte « Méthode et source » : d'où viennent les taux, quel taux a servi au calcul et les conventions appliquées. */
export function PricingMethod({ curve, bond }: PricingMethodProps) {
    const f = useFormatters()
    const t = useTranslations("pages.rates.method")
    // Date de la courbe : la plus récente de ses points (jours `YYYY-MM-DD`, comparables comme du texte)
    const curveDate = curve.points
        .map((p) => p.date)
        .sort()
        .at(-1)
    const rateUsed = bond ? t(`rateUsedValue.${bond.discountSource}`, { rate: f.formatPercent2(bond.rate) }) : <Dash />

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <dl className="flex flex-col">
                    <DetailRow label={t("source")} divided>
                        {t("sourceValue", { symbols: curve.points.map((p) => p.symbol).join(", ") })}
                    </DetailRow>
                    <DetailRow label={t("curveDate")} divided>
                        {curveDate ? f.formatDay(curveDate) : <Dash />}
                    </DetailRow>
                    <DetailRow label={t("rateUsed")} hint="interpolatedRate" divided>
                        {rateUsed}
                    </DetailRow>
                    <DetailRow label={t("discounting")} divided>
                        {t("discountingValue")}
                    </DetailRow>
                    <DetailRow label={t("interpolation")} divided>
                        {t("interpolationValue")}
                    </DetailRow>
                    <DetailRow label={t("euroCurve")} divided>
                        {t("euroCurveValue")}
                    </DetailRow>
                    <DetailRow label={t("credit")}>{t("creditValue")}</DetailRow>
                </dl>
                <p className="text-small text-muted-foreground">{t("note")}</p>
            </CardContent>
        </Card>
    )
}
