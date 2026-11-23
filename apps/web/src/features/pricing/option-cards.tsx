"use client"

import { useTranslations } from "next-intl"
import { Dash } from "@/components/dash"
import { InfoHint } from "@/components/info-hint"
import { StatCard } from "@/components/stat-card"
import { useFormatters } from "@/lib/format"
import type { OptionPrice, OptionResult } from "./types"

type OptionCardsProps = {
    result: OptionResult
    volatility: number // ratio annuel saisi, renvoyé par la demande
    currency: string // devise du sous-jacent (ISO 4217)
    historical: boolean // volatilité saisie = volatilité historique préremplie
}

/** Quatre `StatCard` (maquette 36) : prix du call, prix du put, parité call-put et volatilité utilisée, tels que reçus du moteur. */
export function OptionCards({ result, volatility, currency, historical }: OptionCardsProps) {
    const f = useFormatters()
    const t = useTranslations("pages.options.cards")
    const price = (side: OptionPrice, label: string) => (
        <StatCard
            label={<InfoHint entry="optionPrice">{label}</InfoHint>}
            value={f.formatPrice(side.price, currency)}
            delta={t("perAction")}
            caption={t("timeCaption", {
                time: f.formatPrice(side.timeValue, currency),
                intrinsic: f.formatPrice(side.intrinsicValue, currency),
            })}
        />
    )

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {price(result.call, t("call"))}
            {price(result.put, t("put"))}
            <StatCard
                label={<InfoHint entry="callPutParity">{t("parity")}</InfoHint>}
                value={
                    result.parityVerified == null ? <Dash /> : t(result.parityVerified ? "parityVerified" : "parityGap")
                }
                delta={t("parityBadge", { gap: f.formatParityGap(result.parityGap) })}
                caption={t("parityCaption", { value: f.formatPrice(result.callMinusPut, currency) })}
            />
            <StatCard
                label={<InfoHint entry="optionVolatility">{t("volatility")}</InfoHint>}
                value={f.formatPercent(volatility)}
                delta={t(historical ? "volatilityHistorical" : "volatilityEntered")}
                caption={t(historical ? "volatilityHistoricalCaption" : "volatilityEnteredCaption")}
            />
        </div>
    )
}
