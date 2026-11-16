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
import type { BacktestExecution } from "@/features/backtest/types"
import { fromDecimal, getExecution, isActive } from "@/features/backtest/utils"
import { useApiErrorMessages } from "@/lib/api-error"
import { useFormatters } from "@/lib/format"
import { routes } from "@/lib/routes"
import { ComputedProjection } from "./computed-projection"
import { DEFAULT_PROJECTION_HORIZON } from "./constants"
import { useProjection } from "./hook"
import type { ProjectionView } from "./types"
import { projectionPollMs } from "./utils"

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
    const projection = useProjection(backtestId, (view) => projectionPollMs(view, execution))
    const view = projection.data
    const computed = view?.projection

    const subtitle =
        backtest.data &&
        computed &&
        t("subtitle", {
            allocations: backtest.data.allocations
                .map((a) => `${a.symbol} ${f.formatRate(fromDecimal(a.weight) ?? 0)}`)
                .join(", "),
            period: f.formatDayRange(backtest.data.startDate, backtest.data.endDate),
            paths: f.formatDecimal1(computed.paths),
            horizon: f.formatYears(horizon),
        })

    return (
        <>
            <PageHeader
                title={backtest.data ? t("title", { name: backtest.data.name }) : t("titleEmpty")}
                badge={view?.state === "COMPUTED" && <Badge variant="success">{t("computed")}</Badge>}
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

// État unique de la page : erreur, chargement, données insuffisantes, sans projection ou projection calculée
function ProjectionBody({ backtestId, queries, view, execution, horizon, onHorizonChange }: ProjectionBodyProps) {
    const t = useTranslations("pages.projection")
    const tc = useTranslations("common")
    const { errorMessage } = useApiErrorMessages()
    const queryClient = useQueryClient()
    const rerun = useRerunBacktest(backtestId)
    const failed = queries.find((query) => query.isError)

    if (failed) {
        const retry = (
            <Button variant="outline" onClick={() => failed.refetch()}>
                {tc("retry")}
            </Button>
        )
        return <StateCard error message={errorMessage(failed.error) || t("states.error")} action={retry} />
    }
    if (!view || queries.some((query) => query.isPending)) return <LoadingState className="h-64" />
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
