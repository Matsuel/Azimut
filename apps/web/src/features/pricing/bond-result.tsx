"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFormatters } from "@/lib/format"
import { PRICING_CURRENCY } from "./constants"
import { FlowsTable } from "./flows-table"
import type { PricingView } from "./types"

/** Carte « Résultat » d'une demande terminée : prix, durations et flux actualisés tels que calculés par backtest-engine. */
export function BondResultCard({ view }: { view: PricingView }) {
    const f = useFormatters()
    const t = useTranslations("pages.rates.result")
    const { input, result } = view
    if (input.kind !== "BOND" || result?.kind !== "BOND") return null
    const { bond } = input
    const price = result.bond
    const last = price.flows.at(-1)
    const years = f.formatYears(bond.maturityYears)

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>
                    {t("subtitle", {
                        kind: t(bond.couponRate === 0 ? "kinds.zero" : "kinds.coupon"),
                        years,
                        rate: f.formatPercent2(price.rate),
                    })}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard
                        label={<InfoHint entry="bondPrice">{t("price")}</InfoHint>}
                        value={f.formatPrice(price.price, PRICING_CURRENCY)}
                        caption={t("priceCaption", {
                            nominal: (Number.isInteger(bond.nominal) ? f.formatWholePrice : f.formatPrice)(
                                bond.nominal,
                                PRICING_CURRENCY,
                            ),
                            years,
                        })}
                    />
                    <StatCard
                        label={<InfoHint entry="macaulayDuration">{t("macaulay")}</InfoHint>}
                        value={f.formatYears2(price.macaulayDuration)}
                        caption={t("macaulayCaption")}
                    />
                    <StatCard
                        label={<InfoHint entry="modifiedDuration">{t("modified")}</InfoHint>}
                        value={f.formatYears2(price.modifiedDuration)}
                        caption={t("modifiedCaption", { change: f.formatRatio(price.priceChangeOnRatePlusOnePoint) })}
                    />
                </div>
                <FlowsTable bond={price} />
                {last && (
                    <p className="text-small text-muted-foreground">
                        {t("footnote", {
                            years,
                            factor: f.formatFactor(last.discountFactor),
                            rate: f.formatPercent2(price.rate),
                        })}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
