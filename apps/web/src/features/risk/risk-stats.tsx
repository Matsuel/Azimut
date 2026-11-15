"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { StatCard } from "@/components/stat-card"
import { useFormatters } from "@/lib/format"
import type { Risk } from "./types"

/** Quatre cartes de la maquette 33 : volatilité annualisée, VaR et CVaR à 95 % (un jour), concentration (poids max, HHI). */
export function RiskStats({ risk }: { risk: Risk }) {
    const f = useFormatters()
    const t = useTranslations("risk.stats")

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
                label={<InfoHint entry="riskVolatility">{t("volatility")}</InfoHint>}
                delta={t("period")}
                value={f.formatPercent1(risk.volatility)}
                caption={t("volatilityCaption")}
            />
            <StatCard
                label={<InfoHint entry="valueAtRisk">{t("var")}</InfoHint>}
                delta={t("historical")}
                value={f.formatPercent1(risk.var95)}
                caption={t("varCaption")}
            />
            <StatCard
                label={<InfoHint entry="expectedShortfall">{t("cvar")}</InfoHint>}
                delta={t("historical")}
                value={f.formatPercent1(risk.cvar95)}
                caption={t("cvarCaption")}
            />
            <StatCard
                label={<InfoHint entry="concentration">{t("concentration")}</InfoHint>}
                delta={t("hhi", { value: f.formatCorrelation(risk.hhi) })}
                value={f.formatRate(risk.maxWeight)}
                caption={t("concentrationCaption", { count: f.formatDecimal1(risk.effectiveAssets) })}
            />
        </div>
    )
}
