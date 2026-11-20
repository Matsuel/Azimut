"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { DataTable } from "@/components/data-table/data-table"
import { TableCard } from "@/components/data-table/table-card"
import { FilterTabs } from "@/components/filter-tabs"
import { PAGE_SIZE } from "@/constants/pagination"
import { routes } from "@/lib/routes"
import { useBacktestColumns } from "./column"
import { type StatusFilter, statusFilters } from "./constants"
import { useBacktestStats, useBacktests } from "./hook"
import { BacktestStats } from "./stats"

/**
 * Liste des backtests (stats, filtres, tableau paginé). `rowHref` donne la page ouverte au clic sur une ligne
 * (détail du backtest par défaut) ; `withStats={false}` masque les cartes de stats (écrans Risque et Projection).
 */
export function BacktestList({
    rowHref = routes.backtest,
    withStats = true,
}: {
    rowHref?: (backtestId: string) => string
    withStats?: boolean
}) {
    const t = useTranslations("backtest")
    const router = useRouter()
    const columns = useBacktestColumns()
    const [filter, setFilter] = useState<StatusFilter>("all")
    const [page, setPage] = useState(1)
    const query = useBacktests({ page, pageSize: PAGE_SIZE, status: statusFilters[filter].statuses })
    const stats = useBacktestStats()

    const filterOptions = (Object.keys(statusFilters) as StatusFilter[]).map((value) => ({
        value,
        label: t(`filters.${value}`),
    }))

    const changeFilter = (value: StatusFilter) => {
        setFilter(value)
        setPage(1)
    }

    return (
        <>
            {withStats && <BacktestStats stats={stats.data} />}

            <TableCard
                title={t("list.tableTitle")}
                description={t("list.tableDescription")}
                actions={<FilterTabs value={filter} onChange={changeFilter} options={filterOptions} />}
            >
                <DataTable
                    query={{ ...query, data: query.data?.data }}
                    columns={columns}
                    rowKey={(b) => b.id}
                    onRowClick={(b) => router.push(rowHref(b.id))}
                    emptyMessage={t("list.empty")}
                    pagination={{ page, pageSize: PAGE_SIZE, count: query.data?.count ?? 0, onPageChange: setPage }}
                />
            </TableCard>
        </>
    )
}
