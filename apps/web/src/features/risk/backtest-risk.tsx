"use client"

import { type UseQueryResult, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"
import { BacktestPicker } from "@/components/backtest-picker"
import { PageHeader } from "@/components/page-layout"
import { LoadingState } from "@/components/query-status"
import { StateCard } from "@/components/state-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useBacktest, useRerunBacktest } from "@/features/backtest/hook"
import { awaitResultPollMs } from "@/features/backtest/result-wait"
import type { BacktestDetails, BacktestExecution } from "@/features/backtest/types"
import { formatAllocation, getExecution, isActive } from "@/features/backtest/utils"
import { useApiErrorMessages } from "@/lib/api-error"
import { type Formatters, useFormatters } from "@/lib/format"
import { routes } from "@/lib/routes"
import { AssetExposures } from "./asset-exposures"
import { CorrelationMatrix } from "./correlation-matrix"
import { DrawdownConstraint } from "./drawdown-constraint"
import { useRisk, useSetRiskLimit } from "./hook"
import { RiskContributions } from "./risk-contributions"
import { RiskStats } from "./risk-stats"
import type { RiskTranslator } from "./schema"
import type { RiskView } from "./types"

// Sous-titre de la maquette : allocation, période, fréquence des rendements
const describe = (f: Formatters, t: RiskTranslator, b: BacktestDetails) =>
    t("subtitle", {
        allocations: formatAllocation(f, b.allocations, ", "),
        period: f.formatDayRange(b.startDate, b.endDate),
    })

/**
 * Page Risque d'un backtest (maquette 33, états du cadre `33 · Risque · états`) : backtest choisi dans l'URL
 * (`?backtest=<id>`), cartes de risque, matrice, contributions, contrainte de drawdown et expositions telles que reçues
 * de `GET /api/risk/:backtestId`. `backtestId` vide : état « choisir un backtest ».
 */
export function BacktestRisk({ backtestId }: { backtestId: string }) {
    const t = useTranslations("risk")
    const router = useRouter()
    const picker = <BacktestPicker onSelect={(id) => router.replace(routes.backtestRisk(id), { scroll: false })} />

    if (!backtestId) {
        return (
            <>
                <PageHeader title={t("titleEmpty")} actions={picker} />
                <StateCard message={t("states.empty")} />
            </>
        )
    }
    return <RiskContent backtestId={backtestId} picker={picker} />
}

function RiskContent({ backtestId, picker }: { backtestId: string; picker: ReactNode }) {
    const f = useFormatters()
    const t = useTranslations("risk")
    const backtest = useBacktest(backtestId)
    const execution = backtest.data && getExecution(backtest.data)
    const risk = useRisk(backtestId, (view) => awaitResultPollMs(view.state, execution))
    const view = risk.data

    return (
        <>
            <PageHeader
                title={backtest.data ? t("title", { name: backtest.data.name }) : t("titleEmpty")}
                badge={view?.state === "COMPUTED" && <Badge variant="success">{t("computed")}</Badge>}
                description={backtest.data && describe(f, t, backtest.data)}
                actions={picker}
            />
            <RiskBody backtestId={backtestId} queries={[backtest, risk]} view={view} execution={execution} />
        </>
    )
}

type RiskBodyProps = {
    backtestId: string
    queries: Pick<UseQueryResult, "isError" | "error" | "refetch" | "isPending">[] // backtest puis risque
    view: RiskView | undefined
    execution: BacktestExecution | undefined
}

// État unique de la page : erreur, chargement, sans risque, données insuffisantes ou risque calculé
function RiskBody({ backtestId, queries, view, execution }: RiskBodyProps) {
    const t = useTranslations("risk")
    const tc = useTranslations("common")
    const { errorMessage } = useApiErrorMessages()
    const queryClient = useQueryClient()
    const rerun = useRerunBacktest(backtestId)
    const setLimit = useSetRiskLimit(backtestId)
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
    if (view.state === "UNAVAILABLE") {
        const onRerun = () =>
            rerun.mutate(undefined, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["risk"] }) })
        const canRerun = !rerun.isPending && !(execution && isActive(execution))
        const action = (
            <Button onClick={onRerun} disabled={!canRerun}>
                {t("states.rerun")}
            </Button>
        )
        return <StateCard message={t("states.unavailable")} action={action} />
    }
    return (
        <ComputedRisk
            view={view}
            onCheck={(percent) => setLimit.mutate(percent / 100)}
            pending={setLimit.isPending}
            error={setLimit.isError ? errorMessage(setLimit.error) : undefined}
        />
    )
}

type ComputedRiskProps = { view: RiskView; onCheck: (percent: number) => void; pending: boolean; error?: string }

function ComputedRisk({ view, onCheck, pending, error }: ComputedRiskProps) {
    const { risk, reading } = view
    if (!risk || !reading) return null
    return (
        <>
            <RiskStats risk={risk} />
            <div className="grid gap-6 xl:grid-cols-2">
                <CorrelationMatrix risk={risk} reading={reading} />
                <RiskContributions risk={risk} reading={reading} />
                <DrawdownConstraint constraint={view.constraint} onCheck={onCheck} pending={pending} error={error} />
                <AssetExposures risk={risk} />
            </div>
        </>
    )
}
