"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFormatters } from "@/lib/format"
import type { Risk } from "./types"

/** Carte « Expositions par actif » : poids, volatilité propre et part du risque ; total = volatilité du portefeuille. */
export function AssetExposures({ risk }: { risk: Risk }) {
    const f = useFormatters()
    const t = useTranslations("risk.exposures")

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
                            <TableHead variant="caption">{t("columns.asset")}</TableHead>
                            <TableHead variant="caption" className="text-right">
                                {t("columns.weight")}
                            </TableHead>
                            <TableHead variant="caption" className="text-right">
                                <InfoHint entry="riskVolatility">{t("columns.volatility")}</InfoHint>
                            </TableHead>
                            <TableHead variant="caption" className="text-right">
                                <InfoHint entry="riskContribution">{t("columns.share")}</InfoHint>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {risk.assets.map((asset) => (
                            <TableRow key={asset.symbol} variant="static">
                                <TableCell>{asset.symbol}</TableCell>
                                <TableCell className="text-right">{f.formatRate(asset.weight)}</TableCell>
                                <TableCell className="text-right">{f.formatPercent1(asset.volatility)}</TableCell>
                                <TableCell className="text-right">{f.formatRate(asset.riskContribution)}</TableCell>
                            </TableRow>
                        ))}

                        {/* Poids et contributions somment à 1 par construction ; la volatilité est celle du portefeuille */}
                        <TableRow variant="static">
                            <TableCell variant="strong">{t("total")}</TableCell>
                            <TableCell variant="strong" className="text-right">
                                {f.formatRate(1)}
                            </TableCell>
                            <TableCell variant="strong" className="text-right">
                                {f.formatPercent1(risk.volatility)}
                            </TableCell>
                            <TableCell variant="strong" className="text-right">
                                {f.formatRate(1)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
                <p className="text-small text-muted-foreground">{t("note")}</p>
            </CardContent>
        </Card>
    )
}
