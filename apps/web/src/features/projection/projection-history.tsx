"use client"

import { useTranslations } from "next-intl"
import { Dash } from "@/components/dash"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/features/backtest/status-badge"
import { useFormatters } from "@/lib/format"
import type { ProjectionRun } from "./types"
import { formatComputationDuration } from "./utils"

function StateBadge({ state }: { state: ProjectionRun["state"] }) {
    const t = useTranslations("pages.projection")
    if (state === "PENDING") return <StatusBadge status="RUNNING" />
    return <Badge variant={state === "COMPUTED" ? "success" : "secondary"}>{t(`history.state.${state}`)}</Badge>
}

function RunRow({ run }: { run: ProjectionRun }) {
    const f = useFormatters()
    const t = useTranslations("pages.projection")
    const tBacktest = useTranslations("backtest")

    return (
        <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="text-body-medium">#{run.attempt}</span>
                    <StateBadge state={run.state} />
                </div>
                <span className="text-small text-muted-foreground">
                    {run.computedAt ? f.formatDate(run.computedAt) : <Dash />}
                </span>
            </div>
            <span className="shrink-0 text-small text-muted-foreground">
                {run.durationMs === null ? (
                    <Dash />
                ) : (
                    t("history.duration", { duration: formatComputationDuration(f, tBacktest, run.durationMs) })
                )}
            </span>
        </div>
    )
}

/** Carte « Historique des calculs » : un calcul par exécution du backtest, du plus récent au plus ancien (tentative, date de réception, état, durée ; `<Dash />` si absente). */
export function ProjectionHistory({ history }: { history: ProjectionRun[] }) {
    const t = useTranslations("pages.projection")
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("history.title")}</CardTitle>
            </CardHeader>
            <CardContent>
                {history.map((run) => (
                    <RunRow key={run.executionId} run={run} />
                ))}
            </CardContent>
        </Card>
    )
}
