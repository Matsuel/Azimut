"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { TablePagination } from "@/components/data-table/table-pagination"
import { InfoHint } from "@/components/info-hint"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFormatters } from "@/lib/format"
import { paginate } from "@/lib/pagination"
import { trendOf, trendStyles } from "@/lib/trend"
import { cn } from "@/lib/utils"
import { OPTION_TABLE_PAGE_SIZE } from "./constants"
import type { OptionResult } from "./types"

const COLUMNS = [
    ["finalSpot", "optionFinalSpot"],
    ["callPayoff", "optionPayoff"],
    ["putPayoff", "optionPayoff"],
    ["callNet", "optionNet"],
    ["putNet", "optionNet"],
] as const

/** Carte « Grille de payoff » (maquette 36) : payoff et résultat net d'un achat de call et de put pour chaque cours final de la grille du moteur. */
export function PayoffGrid({ result, currency }: { result: OptionResult; currency: string }) {
    const f = useFormatters()
    const t = useTranslations("pages.options.grid")
    const [page, setPage] = useState(1)
    const money = (value: number) => f.formatPrice(value, currency)
    // Résultat net coloré selon son signe : gain, perte ou nul
    const net = (value: number) => <span className={cn(trendStyles[trendOf(value)].text)}>{f.formatChange(value)}</span>

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <Table>
                    <TableHeader>
                        <TableRow variant="static">
                            {COLUMNS.map(([column, entry], i) => (
                                <TableHead key={column} variant="caption" className={cn("h-10", i > 0 && "text-right")}>
                                    <InfoHint entry={entry}>{t(column)}</InfoHint>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginate(result.payoffGrid, page, OPTION_TABLE_PAGE_SIZE).map((point) => (
                            <TableRow key={point.spot} variant="static" className="h-11">
                                <TableCell>{money(point.spot)}</TableCell>
                                <TableCell className="text-right">{f.formatDecimal2(point.callPayoff)}</TableCell>
                                <TableCell className="text-right">{f.formatDecimal2(point.putPayoff)}</TableCell>
                                <TableCell className="text-right">{net(point.callNet)}</TableCell>
                                <TableCell className="text-right">{net(point.putNet)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    page={page}
                    pageSize={OPTION_TABLE_PAGE_SIZE}
                    count={result.payoffGrid.length}
                    onPageChange={setPage}
                />
            </CardContent>
        </Card>
    )
}
