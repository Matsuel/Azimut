"use client"

import { useTranslations } from "next-intl"
import { Dash } from "@/components/dash"
import { InfoHint } from "@/components/info-hint"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFormatters } from "@/lib/format"
import { PRICING_CURRENCY } from "./constants"
import type { BondResult } from "./types"
import { groupFlows } from "./utils"

/** Tableau des flux (année, flux, facteur d'actualisation, valeur actuelle), échéances sans flux regroupées, et ligne de total. */
export function FlowsTable({ bond }: { bond: BondResult }) {
    const f = useFormatters()
    const t = useTranslations("pages.rates.result")
    const money = (value: number) => f.formatPrice(value, PRICING_CURRENCY)

    return (
        <Table>
            <TableHeader>
                <TableRow variant="static">
                    <TableHead variant="caption" className="h-10">
                        {t("columns.year")}
                    </TableHead>
                    <TableHead variant="caption" className="text-right">
                        {t("columns.flow")}
                    </TableHead>
                    <TableHead variant="caption" className="text-right">
                        <InfoHint entry="discountFactor">{t("columns.factor")}</InfoHint>
                    </TableHead>
                    <TableHead variant="caption" className="text-right">
                        {t("columns.presentValue")}
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {groupFlows(bond.flows).map(({ from, to, flow }) => (
                    <TableRow key={from} variant="static" className="h-11">
                        <TableCell>
                            {from === to ? (
                                <>
                                    {from}{" "}
                                    <span className="hidden text-small text-muted-foreground sm:inline">
                                        {f.formatDay(flow.date)}
                                    </span>
                                </>
                            ) : (
                                t("range", { from, to })
                            )}
                        </TableCell>
                        <TableCell className="text-right">{money(flow.cashFlow)}</TableCell>
                        <TableCell className="text-right">
                            {from === to ? f.formatFactor(flow.discountFactor) : <Dash />}
                        </TableCell>
                        <TableCell className="text-right">{money(flow.presentValue)}</TableCell>
                    </TableRow>
                ))}
                <TableRow variant="static" className="h-11">
                    <TableCell variant="strong">{t("total")}</TableCell>
                    <TableCell className="text-right">{money(bond.totalCashFlow)}</TableCell>
                    <TableCell />
                    <TableCell className="text-right">{money(bond.price)}</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    )
}
