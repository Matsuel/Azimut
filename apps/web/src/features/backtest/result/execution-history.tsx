import { useTranslations } from "next-intl"
import { Progress } from "@/components/ui/progress"
import { type Formatters, useFormatters } from "@/lib/format"
import { StatusBadge } from "../status-badge"
import type { BacktestExecution } from "../types"
import { type BacktestTranslator, executionErrorLabel, getExecutionDuration, isActive } from "../utils"
import { HistoryRow } from "./history-row"

function describe(f: Formatters, t: BacktestTranslator, e: BacktestExecution) {
    switch (e.status) {
        case "PENDING":
            return t("history.pending")
        case "RUNNING":
            return t("history.running")
        case "FAILED":
            return executionErrorLabel(t, e, t("history.unknownError"))
        case "COMPLETED":
            return e.result
                ? t("history.completedSummary", {
                      count: e.result.totalTrades,
                      return: f.formatRatio(Number(e.result.totalReturn)),
                  })
                : t("history.completed")
        default:
            return t(`status.${e.status}`)
    }
}

function duration(t: BacktestTranslator, e: BacktestExecution) {
    const d = getExecutionDuration(t, e)
    if (e.status === "FAILED" && d) return t("duration.after", { duration: d })
    return d ?? t(`status.${e.status}`)
}

function ExecutionRow({ execution: e }: { execution: BacktestExecution }) {
    const f = useFormatters()
    const t = useTranslations("backtest")

    return (
        <HistoryRow
            attempt={e.attempt}
            badge={<StatusBadge status={e.status} />}
            detail={`${f.formatDate(e.createdAt)} · ${describe(f, t, e)}`}
            detailClassName={e.status === "FAILED" ? "text-destructive" : undefined}
            trailing={duration(t, e)}
        >
            {isActive(e) && (
                <Progress
                    aria-label={e.status === "RUNNING" ? t("history.running") : t("history.pending")}
                    value={e.status === "RUNNING" ? 100 : 0}
                    variant="running"
                    size="md"
                    className="mt-1 w-full"
                />
            )}
        </HistoryRow>
    )
}

/** Exécutions d'un backtest, de la plus récente à la plus ancienne : statut, résumé ou cause d'échec, durée. */
export function ExecutionList({ executions }: { executions: BacktestExecution[] }) {
    return (
        <div role="list" className="flex flex-col">
            {executions.map((e) => (
                <ExecutionRow key={e.id} execution={e} />
            ))}
        </div>
    )
}
