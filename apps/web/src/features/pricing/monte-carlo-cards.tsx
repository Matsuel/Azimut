"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { StatCard } from "@/components/stat-card"
import { useFormatters } from "@/lib/format"
import type { OptionMonteCarloResult } from "./types"

type MonteCarloCardsProps = {
    result: OptionMonteCarloResult
    currency: string // devise du sous-jacent (ISO 4217)
}

/** Quatre `StatCard` (maquette 38) : prix Monte Carlo du call vanille, prix Black-Scholes de référence, knock-out et knock-in, tels que reçus du moteur. */
export function MonteCarloCards({ result, currency }: MonteCarloCardsProps) {
    const f = useFormatters()
    const t = useTranslations("pages.optionMonteCarlo.cards")
    const se = (estimate: { standardError: number }) =>
        t("standardError", { value: f.formatDecimal2(estimate.standardError) })
    const barrier = f.formatPrice(result.barrier, currency)

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
                label={<InfoHint entry="monteCarloPrice">{t("monteCarlo")}</InfoHint>}
                value={f.formatPrice(result.vanilla.price, currency)}
                delta={<InfoHint entry="standardError">{se(result.vanilla)}</InfoHint>}
                caption={t("vanillaCaption")}
            />
            <StatCard
                label={t("blackScholes")}
                value={f.formatPrice(result.blackScholesPrice, currency)}
                delta={t("gap", { gap: f.formatDecimal1(result.blackScholesGap) })}
                tone={result.validated ? "positive" : "negative"}
                caption={t(result.validated ? "validatedCaption" : "notValidatedCaption")}
            />
            <StatCard
                label={<InfoHint entry="barrierOption">{t("knockOut")}</InfoHint>}
                value={f.formatPrice(result.knockOut.price, currency)}
                delta={se(result.knockOut)}
                caption={t(result.barrierDirection === "DOWN" ? "barrierDown" : "barrierUp", { barrier })}
            />
            <StatCard
                label={<InfoHint entry="barrierOption">{t("knockIn")}</InfoHint>}
                value={f.formatPrice(result.knockIn.price, currency)}
                delta={se(result.knockIn)}
                caption={
                    result.parityGap === 0
                        ? t("parityCaption", { value: f.formatPrice(result.vanilla.price, currency) })
                        : t("parityGapCaption", { gap: f.formatParityGap(result.parityGap) })
                }
            />
        </div>
    )
}
