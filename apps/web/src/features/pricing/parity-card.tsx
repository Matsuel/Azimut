"use client"

import { useTranslations } from "next-intl"
import { Dash } from "@/components/dash"
import { InfoHint } from "@/components/info-hint"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFormatters } from "@/lib/format"
import type { OptionResult } from "./types"

/** Carte « Parité call-put » (maquette 36) : Call − Put, second membre de la relation et écart, tels que calculés par le moteur. */
export function ParityCard({ result, currency }: { result: OptionResult; currency: string }) {
    const f = useFormatters()
    const t = useTranslations("pages.options.parity")
    const { parityVerified: verified } = result
    const gap = f.formatParityGap(result.parityGap)

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <InfoHint entry="callPutParity">{t("title")}</InfoHint>
                </CardTitle>
                <CardDescription>{t("subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <Table>
                    <TableHeader>
                        <TableRow variant="static">
                            <TableHead variant="caption" className="h-10">
                                {t("term")}
                            </TableHead>
                            <TableHead variant="caption" className="text-right">
                                {t("value")}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow variant="static" className="h-11">
                            <TableCell>{t("callMinusPut")}</TableCell>
                            <TableCell className="text-right">{f.formatPrice(result.callMinusPut, currency)}</TableCell>
                        </TableRow>
                        <TableRow variant="static" className="h-11">
                            <TableCell>{t("right")}</TableCell>
                            <TableCell className="text-right">{f.formatPrice(result.parityRight, currency)}</TableCell>
                        </TableRow>
                        <TableRow variant="static" className="h-11">
                            <TableCell variant="strong">{t("gap")}</TableCell>
                            <TableCell className="text-right">
                                {verified == null ? (
                                    <Dash />
                                ) : (
                                    <Badge variant={verified ? "success" : "outline"}>
                                        {t(verified ? "verified" : "notVerified", { gap })}
                                    </Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
                <p className="text-small text-muted-foreground">{t("note")}</p>
            </CardContent>
        </Card>
    )
}
