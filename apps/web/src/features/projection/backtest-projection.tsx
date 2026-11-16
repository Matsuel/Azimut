"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { type ReactNode, useState } from "react"
import { BacktestPicker } from "@/components/backtest-picker"
import { PageHeader } from "@/components/page-layout"
import { StateCard } from "@/components/state-card"
import { Badge } from "@/components/ui/badge"
import { useBacktest } from "@/features/backtest/hook"
import { awaitResultPollMs } from "@/features/backtest/result-wait"
import { StatusBadge } from "@/features/backtest/status-badge"
import { formatAllocation, getExecution } from "@/features/backtest/utils"
import { useFormatters } from "@/lib/format"
import { routes } from "@/lib/routes"
import { DEFAULT_PROJECTION_HORIZON } from "./constants"
import { useProjection } from "./hook"
import { ProjectionBody } from "./projection-body"
import { ProjectionHistory } from "./projection-history"

/**
 * Page Projection d'un backtest (maquette 34 et ses états) : backtest choisi dans l'URL (`?backtest=<id>`), cartes,
 * éventail, paramètres et percentiles tels que reçus de `GET /api/projection/:backtestId`. `backtestId` vide : état
 * « choisir un backtest ».
 */
export function BacktestProjection({ backtestId }: { backtestId: string }) {
    const t = useTranslations("pages.projection")
    const router = useRouter()
    const picker = (
        <BacktestPicker onSelect={(id) => router.replace(routes.backtestProjection(id), { scroll: false })} />
    )

    if (!backtestId) {
        return (
            <>
                <PageHeader title={t("titleEmpty")} actions={picker} />
                <StateCard message={t("states.empty")} />
            </>
        )
    }
    return <ProjectionContent backtestId={backtestId} picker={picker} />
}

function ProjectionContent({ backtestId, picker }: { backtestId: string; picker: ReactNode }) {
    const f = useFormatters()
    const t = useTranslations("pages.projection")
    const [horizon, setHorizon] = useState<number>(DEFAULT_PROJECTION_HORIZON)
    const backtest = useBacktest(backtestId)
    const execution = backtest.data && getExecution(backtest.data)
    const projection = useProjection(backtestId, (view) => awaitResultPollMs(view.state, execution))
    const view = projection.data
    const computed = view?.projection

    const badge = (
        <>
            {view?.state === "PENDING" && <StatusBadge status="RUNNING" />}
            {view?.state === "COMPUTED" && <Badge variant="success">{t("computed")}</Badge>}
        </>
    )
    const subtitle =
        backtest.data &&
        computed &&
        t("subtitle", {
            allocations: formatAllocation(f, backtest.data.allocations, ", "),
            period: f.formatDayRange(backtest.data.startDate, backtest.data.endDate),
            paths: f.formatDecimal1(computed.paths),
            horizon: f.formatYears(horizon),
        })

    return (
        <>
            <PageHeader
                title={backtest.data ? t("title", { name: backtest.data.name }) : t("titleEmpty")}
                badge={badge}
                description={subtitle || undefined}
                actions={picker}
            />
            <ProjectionBody
                backtestId={backtestId}
                backtestQuery={backtest}
                projectionQuery={projection}
                view={view}
                execution={execution}
                horizon={horizon}
                onHorizonChange={setHorizon}
            />
            {view && view.history.length > 0 && <ProjectionHistory history={view.history} />}
        </>
    )
}
