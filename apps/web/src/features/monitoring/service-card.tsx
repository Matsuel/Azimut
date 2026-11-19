"use client"

import { useTranslations } from "next-intl"
import type { ReactNode } from "react"
import { orDash } from "@/components/dash"
import { InfoHint } from "@/components/info-hint"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { type Formatters, useFormatters } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CHECK_KEYS, stateBadges } from "./constants"
import type { ServiceStatus } from "./types"

/** Écart entre `checkedAt` et `now` en secondes, dans la langue active : « il y a 3 s » (formatage, pas un calcul). */
const formatAgo = (f: Formatters, checkedAt: string, now: Date) =>
    new Intl.RelativeTimeFormat(f.locale, { numeric: "auto", style: "short" }).format(
        -Math.max(0, Math.round((now.getTime() - new Date(checkedAt).getTime()) / 1000)),
        "second",
    )

function CheckRow({ label, value, failed }: { label: string; value: string; failed: boolean }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-body text-muted-foreground">{label}</span>
            <span className={cn("text-body", failed && "text-destructive")}>{value}</span>
        </div>
    )
}

/**
 * Carte d'un service (composant `ServiceCard` de la maquette F16, node `613:14644`) : nom, badge de l'état calculé par
 * core-backend, une ligne par dépendance de `/readiness` (« Sonde /readiness · Sans réponse » pour un service `down`),
 * latence (`<Dash />` si absente) et ancienneté du contrôle par rapport à `now`.
 */
export function ServiceCard({ status, now }: { status: ServiceStatus; now: Date }) {
    const f = useFormatters()
    const t = useTranslations("monitoring")
    const checks = status.checks
    let rows: ReactNode
    if (checks) {
        rows = CHECK_KEYS.filter((key) => checks[key]).map((key) => (
            <CheckRow
                key={key}
                label={t(`checks.${key}`)}
                value={t(`dependency.${checks[key] ?? "down"}`)}
                failed={checks[key] === "down"}
            />
        ))
    } else {
        rows = <CheckRow label={t("card.probe")} value={t("card.noResponse")} failed />
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>{status.service}</CardTitle>
                <CardAction>
                    <Badge variant={stateBadges[status.state]}>{t(`states.${status.state}`)}</Badge>
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
                {/* flex-1 : pousse le pied en bas pour aligner les cartes d'une même rangée */}
                <div className="flex flex-1 flex-col gap-2">{rows}</div>
                <Separator />
                <div className="flex items-center justify-between gap-2 text-small text-muted-foreground">
                    <span>
                        <InfoHint entry="probeLatency">{t("card.latency")}</InfoHint>{" "}
                        {orDash(status.latencyMs, (ms) => t("card.milliseconds", { ms }))}
                    </span>
                    <span>{t("card.checked", { ago: formatAgo(f, status.checkedAt, now) })}</span>
                </div>
            </CardContent>
        </Card>
    )
}
