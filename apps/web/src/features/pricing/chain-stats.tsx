"use client"

import { useTranslations } from "next-intl"
import { Dash } from "@/components/dash"
import { InfoHint } from "@/components/info-hint"
import { StatCard } from "@/components/stat-card"
import { useFormatters } from "@/lib/format"
import { directionOf } from "@/lib/trend"
import type { OptionChainResult } from "./types"

/** Quatre `StatCard` (maquette 37) : contrats retenus, contrats écartés, volatilité implicite ATM et volatilité historique 30 jours, telles que reçues du moteur. */
export function ChainStats({ chain }: { chain: OptionChainResult }) {
    const f = useFormatters()
    const t = useTranslations("pages.optionChain.stats")
    const { atmVolatility, historicalVolatility, volatilityPremium } = chain
    const discarded = chain.contractsTotal - chain.contractsKept

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
                label={<InfoHint entry="quoteFilter">{t("kept")}</InfoHint>}
                value={`${chain.contractsKept} / ${chain.contractsTotal}`}
                delta={t("keptBadge")}
                caption={t("keptCaption")}
            />
            <StatCard
                label={<InfoHint entry="quoteFilter">{t("discarded")}</InfoHint>}
                value={discarded}
                delta={t("discardedBadge")}
                caption={t("discardedCaption")}
            />
            <StatCard
                label={<InfoHint entry="impliedVolatility">{t("atm")}</InfoHint>}
                value={atmVolatility === null ? <Dash /> : f.formatPercent1(atmVolatility)}
                delta={f.formatDay(chain.chainExpiration)}
                caption={t("atmCaption")}
            />
            <StatCard
                label={<InfoHint entry="historicalVolatility30">{t("historical")}</InfoHint>}
                value={historicalVolatility === null ? <Dash /> : f.formatPercent1(historicalVolatility)}
                delta={
                    volatilityPremium === null
                        ? null
                        : t("premium", { points: f.formatChange(volatilityPremium * 100) })
                }
                trend={volatilityPremium === null ? "none" : directionOf(volatilityPremium)}
                caption={
                    volatilityPremium !== null && volatilityPremium > 0
                        ? t("marketAnticipatesMore")
                        : t("historicalCaption")
                }
            />
        </div>
    )
}
