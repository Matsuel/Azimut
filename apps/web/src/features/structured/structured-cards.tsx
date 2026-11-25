"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { StatCard } from "@/components/stat-card"
import { useFormatters } from "@/lib/format"
import { STRUCTURED_CURRENCY } from "./constants"
import type { StructuredInput, StructuredResult } from "./types"

/** Quatrième carte, propre au produit : participation (capital garanti), coupon (reverse convertible) ou probabilité de rappel (autocallable). */
function ProductCard({ result, input }: { result: StructuredResult; input: StructuredInput }) {
    const f = useFormatters()
    const t = useTranslations("pages.structured.cards")
    const money = (value: number) => f.formatPrice(value, STRUCTURED_CURRENCY)

    if (result.product === "CAPITAL_GUARANTEED") {
        return (
            <StatCard
                label={<InfoHint entry="structuredParticipation">{t("participation")}</InfoHint>}
                value={f.formatRate(result.participation)}
                delta={t("participationBadge")}
                caption={
                    <InfoHint entry="structuredOptionBudget">
                        {t("participationCaption", {
                            budget: money(result.optionBudget),
                            call: money(result.callPrice),
                        })}
                    </InfoHint>
                }
            />
        )
    }
    if (result.product === "REVERSE_CONVERTIBLE") {
        return (
            <StatCard
                label={t("coupon")}
                value={f.formatPercent2("couponRate" in input ? input.couponRate : 0)}
                delta={t("couponBadge")}
                caption={t("couponCaption", { put: money(result.putPrice) })}
            />
        )
    }
    return (
        <StatCard
            label={<InfoHint entry="structuredRecallProbability">{t("recall")}</InfoHint>}
            value={f.formatRate(result.recallProbability)}
            delta={f.formatYears(input.maturityYears)}
            caption={t("recallCaption")}
        />
    )
}

/** Quatre `StatCard` (maquette 39) : juste valeur, prix client, marge et la carte du produit, telles que reçues du moteur (aucun calcul côté web). */
export function StructuredCards({ result, input }: { result: StructuredResult; input: StructuredInput }) {
    const f = useFormatters()
    const t = useTranslations("pages.structured.cards")

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
                label={<InfoHint entry="structuredFairValue">{t("fairValue")}</InfoHint>}
                value={f.formatPrice(result.fairValue, STRUCTURED_CURRENCY)}
                delta={f.formatPercent1(result.fairValueRatio)}
                caption={t("fairValueCaption")}
            />
            <StatCard
                label={t("clientPrice")}
                value={f.formatPrice(result.clientPrice, STRUCTURED_CURRENCY)}
                delta={t("clientRatio")}
                caption={t("clientCaption")}
            />
            <StatCard
                label={<InfoHint entry="structuredMargin">{t("margin")}</InfoHint>}
                value={f.formatPrice(result.margin, STRUCTURED_CURRENCY)}
                delta={f.formatPercent1(result.marginRatio)}
                caption={t("marginCaption")}
            />
            <ProductCard result={result} input={input} />
        </div>
    )
}
