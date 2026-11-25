"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFormatters } from "@/lib/format"
import { SEGMENT_COLORS, STRUCTURED_CURRENCY } from "./constants"
import { useStructuredNotes } from "./notes"
import type { StructuredInput, StructuredResult } from "./types"
import { type BarSegment, barSegments } from "./utils"

type DecompositionCardProps = { result: StructuredResult; input: StructuredInput }

// Libellé de légende d'un segment : une brique d'obligation ou de put se lit dans la juste valeur (voir `barSegments`)
const legendKey = (key: BarSegment["key"]) => (key === "BOND" || key === "PUT" ? "FAIR_VALUE" : key)

// Barre empilée du prix client : un segment par part. `div` : shadcn n'a pas de barre multicolore (`Progress` n'a qu'une valeur)
function StackedBar({ result }: { result: StructuredResult }) {
    const t = useTranslations("pages.structured.decomposition.legend")
    return (
        <div className="flex h-6 gap-0.5">
            {barSegments(result).map(({ key, ratio }) => (
                <div
                    key={key}
                    role="img"
                    aria-label={t(legendKey(key))}
                    className="rounded-sm"
                    style={{ width: `${ratio * 100}%`, backgroundColor: SEGMENT_COLORS[key] }}
                />
            ))}
        </div>
    )
}

// Lignes du tableau : les briques reçues, puis juste valeur, marge et prix client (`strong` : ligne en gras)
function useDecompositionRows(result: StructuredResult, input: StructuredInput) {
    const f = useFormatters()
    const t = useTranslations("pages.structured.decomposition")
    const nameValues = {
        years: input.maturityYears,
        participation: result.product === "CAPITAL_GUARANTEED" ? f.formatRate(result.participation) : "",
    }
    return [
        ...result.bricks.map(({ type, value, ratio }) => ({
            key: type,
            name: t(`bricks.${result.product}.${type}.name` as "bricks.CAPITAL_GUARANTEED.CALL.name", nameValues),
            role: t(`bricks.${result.product}.${type}.role` as "bricks.CAPITAL_GUARANTEED.CALL.role"),
            value,
            ratio,
            strong: false,
        })),
        {
            key: "fair",
            name: t("fairValue"),
            role: t("fairValueRole"),
            value: result.fairValue,
            ratio: result.fairValueRatio,
            strong: true,
        },
        {
            key: "margin",
            name: t("margin"),
            role: t("marginRole"),
            value: result.margin,
            ratio: result.marginRatio,
            strong: false,
        },
        { key: "client", name: t("clientPrice"), role: "", value: result.clientPrice, ratio: 1, strong: true },
    ]
}

// Tableau des briques : nom, rôle, valeur en EUR et part du nominal
function BricksTable({ result, input }: DecompositionCardProps) {
    const f = useFormatters()
    const t = useTranslations("pages.structured.decomposition")
    const rows = useDecompositionRows(result, input)

    return (
        <Table>
            <TableHeader>
                <TableRow variant="static">
                    <TableHead variant="caption">{t("brick")}</TableHead>
                    <TableHead variant="caption">{t("role")}</TableHead>
                    <TableHead variant="caption" className="text-right">
                        {t("value")}
                    </TableHead>
                    <TableHead variant="caption" className="text-right">
                        {t("ofNominal")}
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((row) => (
                    <TableRow key={row.key} variant="static" className="h-11">
                        <TableCell className={row.strong ? "text-body-semibold" : undefined}>
                            {row.key === "fair" ? (
                                <InfoHint entry="structuredFairValue">{row.name}</InfoHint>
                            ) : (
                                row.name
                            )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.role}</TableCell>
                        <TableCell className={row.strong ? "text-right text-body-semibold" : "text-right"}>
                            {f.formatPrice(row.value, STRUCTURED_CURRENCY)}
                        </TableCell>
                        <TableCell className="text-right">{f.formatPercent1(row.ratio)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

/** Carte « Décomposition » (maquette 39) : barre empilée, tableau des briques (valeur et part du nominal), juste valeur, marge et prix client, puis la note de calcul. */
export function DecompositionCard({ result, input }: DecompositionCardProps) {
    const t = useTranslations("pages.structured.decomposition")
    const notes = useStructuredNotes()
    const segments = barSegments(result)

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("subtitle")}</CardDescription>
                <CardAction className="flex gap-4 text-small text-muted-foreground">
                    {segments.map(({ key }) => (
                        <span key={key} className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[key] }} />
                            {t(`legend.${legendKey(key)}`)}
                        </span>
                    ))}
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <StackedBar result={result} />
                <BricksTable result={result} input={input} />
                <p className="text-small text-muted-foreground">{notes.decomposition(result, input)}</p>
            </CardContent>
        </Card>
    )
}
