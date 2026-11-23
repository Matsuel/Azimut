"use client"

import { useTranslations } from "next-intl"
import { Dash } from "@/components/dash"
import { type Column, DataTable } from "@/components/data-table/data-table"
import { TableCard } from "@/components/data-table/table-card"
import { Badge } from "@/components/ui/badge"
import { useFormatters } from "@/lib/format"
import { QUOTE_STATUS_BADGES } from "./constants"
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
        { header: t("bid"), cell: (row) => f.formatDecimal2(row.bid), className: "text-right" },
        { header: t("ask"), cell: (row) => f.formatDecimal2(row.ask), className: "text-right" },
        { header: t("mid"), cell: (row) => price(row.mid), className: "text-right" },
        {
            header: t("engineVolatility"),
            cell: (row) => <span className="text-body-semibold">{percent(row.impliedVolatility)}</span>,
            className: "text-right",
        },
        {
            header: t("yahooVolatility"),
            cell: (row) => <span className="text-muted-foreground">{percent(row.yahooVolatility)}</span>,
            className: "text-right",
        },
        {
            header: t("status"),
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
    const { discarded } = chain

    return (
        <TableCard title={t("title", { expiration: f.formatDay(chain.chainExpiration) })} description={t("subtitle")}>
            <DataTable
                rows={chain.chain}
                columns={columns}
                rowKey={(row) => `${row.side}-${row.strike}`}
                emptyMessage={t("empty")}
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
