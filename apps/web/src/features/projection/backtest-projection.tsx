"use client"

import { type UseQueryResult, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { type ReactNode, useState } from "react"
import { BacktestPicker } from "@/components/backtest-picker"
import { PageHeader } from "@/components/page-layout"
import { LoadingState } from "@/components/query-status"
import { StateCard } from "@/components/state-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useBacktest, useRerunBacktest } from "@/features/backtest/hook"
import { awaitResultPollMs } from "@/features/backtest/result-wait"
import { StatusBadge } from "@/features/backtest/status-badge"
import type { BacktestExecution } from "@/features/backtest/types"
import { formatAllocation, getExecution, isActive } from "@/features/backtest/utils"
import { useApiErrorMessages } from "@/lib/api-error"
import { useFormatters } from "@/lib/format"
import { routes } from "@/lib/routes"
import { ComputedProjection } from "./computed-projection"
import { DEFAULT_PROJECTION_HORIZON } from "./constants"
import { useProjection } from "./hook"
import { ProjectionHistory } from "./projection-history"
import type { ProjectionView } from "./types"

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
                queries={[backtest, projection]}
                view={view}
                execution={execution}
                horizon={horizon}
                onHorizonChange={setHorizon}
            />
            {view && view.history.length > 0 && <ProjectionHistory history={view.history} />}
        </>
    )
}

type ProjectionBodyProps = {
    backtestId: string
    queries: Pick<UseQueryResult, "isError" | "error" | "refetch" | "isPending">[] // backtest puis projection
    view: ProjectionView | undefined
    execution: BacktestExecution | undefined
    horizon: number
    onHorizonChange: (horizon: number) => void
}

// État unique de la page : erreur, chargement, calcul en cours (ou trop long), données insuffisantes, sans projection ou projection calculée
function ProjectionBody({ backtestId, queries, view, execution, horizon, onHorizonChange }: ProjectionBodyProps) {
    const t = useTranslations("pages.projection")
    const tc = useTranslations("common")
    const { errorMessage } = useApiErrorMessages()
    const queryClient = useQueryClient()
    const rerun = useRerunBacktest(backtestId)
    const failed = queries.find((query) => query.isError)

    const retry = (query: Pick<UseQueryResult, "refetch">) => (
        <Button variant="outline" onClick={() => query.refetch()}>
            {tc("retry")}
        </Button>
    )

    if (failed) {
        return <StateCard error message={errorMessage(failed.error) || t("states.error")} action={retry(failed)} />
    }
    if (!view || queries.some((query) => query.isPending)) return <LoadingState className="h-64" />
    if (view.state === "PENDING") {
        // Passé l'attente, `awaitResultPollMs` rend `false` : le calcul tarde, on propose de relire plutôt que d'attendre sans fin
        const waiting = execution && awaitResultPollMs(view.state, execution) !== false
        if (waiting) return <StateCard message={t("states.pending")} />
        return <StateCard message={t("states.slow")} action={retry(queries[1]!)} />
    }
    if (view.state === "INSUFFICIENT_DATA") return <StateCard message={t("states.insufficientData")} />
    if (view.state === "UNAVAILABLE" || !view.projection) {
        const onRerun = () =>
            rerun.mutate(undefined, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projection"] }) })
        const canRerun = !rerun.isPending && !(execution && isActive(execution))
        const action = (
            <Button onClick={onRerun} disabled={!canRerun}>
                {t("states.rerun")}
            </Button>
        )
        return <StateCard message={t("states.unavailable")} action={action} />
    }
    return <ComputedProjection projection={view.projection} horizon={horizon} onHorizonChange={onHorizonChange} />
}
