"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { StatCard } from "@/components/stat-card"
import type { MonitoringServicesResponse } from "./types"

/**
 * Quatre cartes de synthèse de la maquette `09 · Monitoring` (F16) : services disponibles, dégradés, hors ligne
 * (noms des services en sous-titre) et intervalle de rafraîchissement. Comptes reçus tels quels de `summary`.
 */
export function MonitoringStats({
    summary,
    interval,
}: {
    summary: MonitoringServicesResponse["summary"]
    interval: string
}) {
    const t = useTranslations("monitoring.stats")

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
                label={<InfoHint entry="serviceState">{t("available")}</InfoHint>}
                value={t("availableValue", { up: summary.up, total: summary.total })}
                caption={t("availableCaption")}
            />
            <StatCard label={t("degraded")} value={summary.degraded} caption={t("degradedCaption")} />
            <StatCard label={t("down")} value={summary.down} caption={summary.downServices.join(", ")} />
            <StatCard label={t("interval")} value={interval} caption={t("intervalCaption")} />
        </div>
    )
}
