"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { Dash } from "@/components/dash"
import { type Column, DataTable } from "@/components/data-table/data-table"
import { TableCard } from "@/components/data-table/table-card"
import { InfoHint } from "@/components/info-hint"
import { Badge } from "@/components/ui/badge"
import { useFormatters } from "@/lib/format"
import { paginate } from "@/lib/pagination"
import { OPTION_TABLE_PAGE_SIZE, QUOTE_STATUS_BADGES } from "./constants"
import type { ChainRow, OptionChainResult } from "./types"

// Colonnes de la chaîne : cotations lues, volatilité du moteur (en gras), volatilité de Yahoo comparée (grisée), statut du filtre
function useChainColumns(): Column<ChainRow>[] {
    const f = useFormatters()
    const t = useTranslations("pages.optionChain.chain")
    const status = useTranslations("pages.optionChain.status")
    const price = (value: number | null) => (value === null || value === 0 ? <Dash /> : f.formatDecimal2(value))
    const percent = (value: number | null) => (value === null ? <Dash /> : f.formatPercent1(value))

    return [
        { header: t("strike"), cell: (row) => row.strike },
        { header: t("type"), cell: (row) => t(row.side) },
        {
            header: <InfoHint entry="quoteBidAsk">{t("bid")}</InfoHint>,
            cell: (row) => f.formatDecimal2(row.bid),
            className: "text-right",
        },
        {
            header: <InfoHint entry="quoteBidAsk">{t("ask")}</InfoHint>,
            cell: (row) => f.formatDecimal2(row.ask),
            className: "text-right",
        },
        {
            header: <InfoHint entry="midPrice">{t("mid")}</InfoHint>,
            cell: (row) => price(row.mid),
            className: "text-right",
        },
        {
            header: <InfoHint entry="impliedVolatility">{t("engineVolatility")}</InfoHint>,
            cell: (row) => <span className="text-body-semibold">{percent(row.impliedVolatility)}</span>,
            className: "text-right",
        },
        {
            header: <InfoHint entry="yahooVolatility">{t("yahooVolatility")}</InfoHint>,
            cell: (row) => <span className="text-muted-foreground">{percent(row.yahooVolatility)}</span>,
            className: "text-right",
        },
        {
            header: <InfoHint entry="quoteFilter">{t("status")}</InfoHint>,
            cell: (row) => {
                const badge = QUOTE_STATUS_BADGES[row.status]
                return <Badge variant={badge.variant}>{status(badge.key)}</Badge>
            },
            className: "text-right",
        },
    ]
}

/** Carte « Chaîne » (maquette 37) : toutes les cotations de l'échéance détaillée, retenues ou écartées, avec la cause ; le filtre reste visible. */
export function ChainTable({ chain }: { chain: OptionChainResult }) {
    const f = useFormatters()
    const t = useTranslations("pages.optionChain.chain")
    const columns = useChainColumns()
    const [page, setPage] = useState(1)
    const { discarded } = chain

    return (
        <TableCard title={t("title", { expiration: f.formatDay(chain.chainExpiration) })} description={t("subtitle")}>
            <DataTable
                rows={paginate(chain.chain, page, OPTION_TABLE_PAGE_SIZE)}
                columns={columns}
                rowKey={(row) => `${row.side}-${row.strike}`}
                emptyMessage={t("empty")}
                pagination={{
                    page,
                    pageSize: OPTION_TABLE_PAGE_SIZE,
                    count: chain.chain.length,
                    onPageChange: setPage,
                }}
            />
            <p className="p-4 text-small text-muted-foreground">
                {t("footnote", {
                    discarded: chain.contractsTotal - chain.contractsKept,
                    total: chain.contractsTotal,
                    noBidAsk: discarded.noBidAsk,
                    noPrice: discarded.noPrice,
                    ivOutOfBounds: discarded.ivOutOfBounds,
                })}
            </p>
        </TableCard>
    )
}
