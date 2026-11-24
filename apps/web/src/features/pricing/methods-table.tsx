"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFormatters } from "@/lib/format"
import type { OptionMonteCarloResult } from "./types"

type MethodsTableProps = {
    result: OptionMonteCarloResult
    currency: string // devise du sous-jacent (ISO 4217)
}

/** Carte « Comparaison des méthodes » (maquette 38) : formule fermée contre simulation pour la vanille, simulation seule pour les barrières, parité KO + KI = vanille. */
export function MethodsTable({ result, currency }: MethodsTableProps) {
    const f = useFormatters()
    const t = useTranslations("pages.optionMonteCarlo.methods")
    const barrier = f.formatPrice(result.barrier, currency)
    const money = (value: number) => f.formatPrice(value, currency)
    const dash = "—"

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <Table>
                    <TableHeader>
                        <TableRow variant="static">
                            <TableHead variant="caption">{t("product")}</TableHead>
                            <TableHead variant="caption" className="text-right">
                                {t("formula")}
                            </TableHead>
                            <TableHead variant="caption" className="text-right">
                                {t("monteCarlo")}
                            </TableHead>
                            <TableHead variant="caption" className="text-right">
                                <InfoHint entry="standardError">{t("standardError")}</InfoHint>
                            </TableHead>
                            <TableHead variant="caption" className="text-right">
                                {t("status")}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow variant="static" className="h-11">
                            <TableCell>{t("vanilla")}</TableCell>
                            <TableCell className="text-right">{money(result.blackScholesPrice)}</TableCell>
                            <TableCell className="text-right">{money(result.vanilla.price)}</TableCell>
                            <TableCell className="text-right">
                                {f.formatDecimal2(result.vanilla.standardError)}
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge variant={result.validated ? "success" : "outline"}>
                                    {t(result.validated ? "validated" : "notValidated", {
                                        gap: f.formatDecimal1(result.blackScholesGap),
                                    })}
                                </Badge>
                            </TableCell>
                        </TableRow>
                        {(["knockOut", "knockIn"] as const).map((product) => (
                            <TableRow key={product} variant="static" className="h-11">
                                <TableCell>{t(product, { barrier })}</TableCell>
                                <TableCell className="text-right">{dash}</TableCell>
                                <TableCell className="text-right">{money(result[product].price)}</TableCell>
                                <TableCell className="text-right">
                                    {f.formatDecimal2(result[product].standardError)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="outline">{t("noFormula")}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        <TableRow variant="static" className="h-11">
                            <TableCell>{t("parity")}</TableCell>
                            <TableCell className="text-right">{money(result.blackScholesPrice)}</TableCell>
                            <TableCell className="text-right">{money(result.vanilla.price)}</TableCell>
                            <TableCell className="text-right">{dash}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant="outline">
                                    {result.parityGap === 0
                                        ? t("equalsVanilla")
                                        : t("parityGap", { gap: f.formatParityGap(result.parityGap) })}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
                <p className="text-small text-muted-foreground">{t("note")}</p>
            </CardContent>
        </Card>
    )
}
