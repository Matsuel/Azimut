"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BACKTEST_CURRENCY } from "@/features/backtest/constants"
import { useFormatters } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ProjectionYear } from "./types"

// Probabilité de perte à partir de laquelle la cellule passe en rouge (maquette 34 : 21 % rouge, 13 % neutre) : affichage seul
const LOSS_ALERT_RATIO = 0.2

/** Carte « Percentiles par horizon » : une ligne par année de `years` jusqu'à `horizonYears` (EUR, probabilité en ratio). */
export function ProjectionPercentiles({ years, horizonYears }: { years: ProjectionYear[]; horizonYears: number }) {
    const f = useFormatters()
    const t = useTranslations("pages.projection.percentiles")
    const rows = years.filter((year) => year.years <= horizonYears)
    const amount = (value: number) => f.formatWholePrice(value, BACKTEST_CURRENCY)

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <Table>
                    <TableHeader>
                        <TableRow variant="static">
                            <TableHead variant="caption">{t("columns.horizon")}</TableHead>
                            <TableHead variant="caption" className="text-right">
                                <InfoHint entry="projectionPercentile">{t("columns.p10")}</InfoHint>
                            </TableHead>
                            <TableHead variant="caption" className="text-right">
                                {t("columns.median")}
                            </TableHead>
                            <TableHead variant="caption" className="text-right">
                                {t("columns.p90")}
                            </TableHead>
                            <TableHead variant="caption" className="text-right">
                                <InfoHint entry="projectionLossProbability">{t("columns.loss")}</InfoHint>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((year) => (
                            <TableRow key={year.years} variant="static">
                                <TableCell>{f.formatYears(year.years)}</TableCell>
                                <TableCell className="text-right">{amount(year.p10)}</TableCell>
                                <TableCell className="text-right">{amount(year.p50)}</TableCell>
                                <TableCell className="text-right">{amount(year.p90)}</TableCell>
                                <TableCell
                                    className={cn(
                                        "text-right",
                                        year.lossProbability >= LOSS_ALERT_RATIO && "text-destructive",
                                    )}
                                >
                                    {f.formatPercent1(year.lossProbability)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <p className="text-small text-muted-foreground">{t("note")}</p>
            </CardContent>
        </Card>
    )
}
