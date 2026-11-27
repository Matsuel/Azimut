"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFormatters } from "@/lib/format"
import { STRUCTURED_CURRENCY } from "./constants"
import type { AutocallableResult, StructuredInput } from "./types"

type AutocallableInput = Extract<StructuredInput, { product: "AUTOCALLABLE" }>

// Tableau des années d'observation, puis de l'échéance (probabilité d'y arriver sans rappel)
function ObservationsTable({ result, input }: { result: AutocallableResult; input: AutocallableInput }) {
    const f = useFormatters()
    const t = useTranslations("pages.structured.observations")

    return (
        <Table>
            <TableHeader>
                <TableRow variant="static">
                    <TableHead variant="caption">{t("date")}</TableHead>
                    <TableHead variant="caption" className="text-right">
                        <InfoHint entry="structuredRecallLevel">{t("recallLevel")}</InfoHint>
                    </TableHead>
                    <TableHead variant="caption" className="text-right">
                        {t("coupon")}
                    </TableHead>
                    <TableHead variant="caption" className="text-right">
                        <InfoHint entry="structuredRecallProbability">{t("probability")}</InfoHint>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {result.observations.map((row) => (
                    <TableRow key={row.year} variant="static" className="h-11">
                        <TableCell>{f.formatMediumDate(row.date)}</TableCell>
                        <TableCell className="text-right">{f.formatRate(row.recallLevel)}</TableCell>
                        <TableCell className="text-right">{f.formatRate(row.cumulativeCoupon)}</TableCell>
                        <TableCell className="text-right">{f.formatRate(row.recallProbability)}</TableCell>
                    </TableRow>
                ))}
                <TableRow variant="static" className="h-11 text-body-semibold">
                    <TableCell>{t("end", { date: f.formatMediumDate(result.maturityDate) })}</TableCell>
                    <TableCell className="text-right">{f.formatRate(input.protectionBarrier)}</TableCell>
                    <TableCell className="text-right">{f.formatRate(result.maturityCumulativeCoupon)}</TableCell>
                    <TableCell className="text-right">{f.formatRate(result.maturityProbability)}</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    )
}

/**
 * Carte « Autocallable · dates d'observation » (maquette 39) : prix simulé et erreur standard, barrière de protection, une ligne par
 * année avant l'échéance (seuil, coupon cumulé, probabilité de rappel) puis l'échéance (probabilité d'y arriver sans rappel).
 */
export function ObservationsCard({ result, input }: { result: AutocallableResult; input: StructuredInput }) {
    const f = useFormatters()
    const t = useTranslations("pages.structured.observations")
    if (input.product !== "AUTOCALLABLE") return null

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>
                    {t("subtitle", {
                        coupon: f.formatPercent1(input.couponRate),
                        recall: f.formatRate(input.recallLevel),
                        barrier: f.formatRate(input.protectionBarrier),
                    })}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <StatCard
                        label={t("price")}
                        value={f.formatPrice(result.fairValue, STRUCTURED_CURRENCY)}
                        caption={t("priceCaption", { error: f.formatPrice(result.standardError, STRUCTURED_CURRENCY) })}
                    />
                    <StatCard
                        label={<InfoHint entry="structuredProtectionBarrier">{t("barrier")}</InfoHint>}
                        value={f.formatRate(input.protectionBarrier)}
                        caption={t("barrierCaption")}
                    />
                </div>
                <ObservationsTable result={result} input={input} />
                <p className="text-small text-muted-foreground">
                    {t("note", { paths: f.formatDecimal1(result.paths), seed: result.seed })}
                </p>
            </CardContent>
        </Card>
    )
}
