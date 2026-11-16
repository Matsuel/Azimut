"use client"

import { type UseQueryResult, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { LoadingState } from "@/components/query-status"
import { StateCard } from "@/components/state-card"
import { Button } from "@/components/ui/button"
import { useRerunBacktest } from "@/features/backtest/hook"
import type { BacktestExecution } from "@/features/backtest/types"
import { isActive } from "@/features/backtest/utils"
import { useApiErrorMessages } from "@/lib/api-error"
import { ComputedProjection } from "./computed-projection"
import type { ProjectionView } from "./types"

type ProjectionQuery = Pick<UseQueryResult, "isError" | "error" | "refetch" | "isPending">

type ProjectionBodyProps = {
    backtestId: string
    backtestQuery: ProjectionQuery
    projectionQuery: ProjectionQuery
    view: ProjectionView | undefined
    execution: BacktestExecution | undefined
    horizon: number
    onHorizonChange: (horizon: number) => void
}

/**
 * Corps de la page : état unique (erreur, chargement, calcul en cours, données insuffisantes, sans
 * projection) rendu en carte d'état, ou projection calculée.
 */
export function ProjectionBody({
    backtestId,
    backtestQuery,
    projectionQuery,
    view,
    execution,
    horizon,
    onHorizonChange,
}: ProjectionBodyProps) {
    const t = useTranslations("pages.projection")
    const tc = useTranslations("common")
    const { errorMessage } = useApiErrorMessages()
    const queryClient = useQueryClient()
    const rerun = useRerunBacktest(backtestId)
    const queries = [backtestQuery, projectionQuery]
    const failed = queries.find((query) => query.isError)

    const retry = (query: Pick<UseQueryResult, "refetch">) => (
        <Button variant="outline" onClick={() => query.refetch()}>
            {tc("retry")}
        </Button>
    )

    const onRerun = () =>
        rerun.mutate(undefined, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projection"] }) })
    const canRerun = !rerun.isPending && !(execution && isActive(execution))
    const rerunButton = (
        <Button onClick={onRerun} disabled={!canRerun}>
            {t("states.rerun")}
        </Button>
    )

    if (failed) {
        return <StateCard error message={errorMessage(failed.error) || t("states.error")} action={retry(failed)} />
    }
    if (!view || queries.some((query) => query.isPending)) return <LoadingState className="h-64" />
    // Un calcul bloqué est expiré par le serveur (UNAVAILABLE) : le web n'a pas de délai à lui
    if (view.state === "PENDING") return <StateCard message={t("states.pending")} />
    if (view.state === "INSUFFICIENT_DATA") return <StateCard message={t("states.insufficientData")} />
    if (view.state === "UNAVAILABLE" || !view.projection) {
        return <StateCard message={t("states.unavailable")} action={rerunButton} />
    }
    return <ComputedProjection projection={view.projection} horizon={horizon} onHorizonChange={onHorizonChange} />
}
