"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { FormProvider, useForm } from "react-hook-form"
import { NumberField } from "@/components/form/fields/number-field"
import { InfoHint } from "@/components/info-hint"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldError } from "@/components/ui/field"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFormatters } from "@/lib/format"
import { cn } from "@/lib/utils"
import { createRiskLimitSchema, type RiskLimitValues } from "./schema"
import type { RiskConstraint, RiskConstraintCheck } from "./types"

type DrawdownConstraintProps = {
    constraint: RiskConstraint | null
    onCheck: (limitPercent: number) => void // entier de 1 à 99, converti en ratio par l'écran
    pending: boolean
    error?: string // erreur de l'API (limite refusée, pas de résultat)
}

/** Carte « Contrainte de drawdown » : saisie de la limite, puis vérifications Actuelle et Précédente reçues de l'API. */
export function DrawdownConstraint({ constraint, onCheck, pending, error }: DrawdownConstraintProps) {
    const t = useTranslations("risk")
    // Champ vide à la première vérification (D9), puis prérempli avec la limite actuelle (ratio → pourcent)
    const current = constraint && Math.round(constraint.current.limit * 100)
    const form = useForm<RiskLimitValues>({
        resolver: zodResolver(createRiskLimitSchema(t)),
        defaultValues: current ? { limit: current } : {},
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("constraint.title")}</CardTitle>
                <CardDescription>{t("constraint.description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <FormProvider {...form}>
                    <form
                        onSubmit={form.handleSubmit(({ limit }) => onCheck(limit))}
                        className="flex items-start gap-2"
                    >
                        <NumberField<RiskLimitValues> name="limit" label={t("constraint.limit")} className="flex-1" />
                        <Button type="submit" disabled={pending} className="mt-6">
                            {t("constraint.check")}
                        </Button>
                    </form>
                </FormProvider>
                {error && <FieldError>{error}</FieldError>}
                {constraint && <ChecksTable constraint={constraint} />}
                <p className="text-small text-muted-foreground">{t("constraint.disclaimer")}</p>
            </CardContent>
        </Card>
    )
}

function ChecksTable({ constraint }: { constraint: RiskConstraint }) {
    const f = useFormatters()
    const t = useTranslations("risk.constraint")
    const { current, previous, measured } = constraint

    return (
        <Table>
            <TableHeader>
                <TableRow variant="static">
                    <TableHead variant="caption">{t("columns.check")}</TableHead>
                    <TableHead variant="caption" className="text-right">
                        {t("columns.limit")}
                    </TableHead>
                    <TableHead variant="caption" className="text-right">
                        <InfoHint entry="maxDrawdown">{t("columns.measured")}</InfoHint>
                    </TableHead>
                    <TableHead variant="caption" className="text-right">
                        {t("columns.status")}
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <CheckRow label={t("current")} check={current} measured={measured} strong />
                {previous && (
                    <CheckRow
                        label={t("previous", { limit: f.formatRate(previous.limit) })}
                        check={previous}
                        measured={measured}
                    />
                )}
            </TableBody>
        </Table>
    )
}

type CheckRowProps = { label: string; check: RiskConstraintCheck; measured: number; strong?: boolean }

function CheckRow({ label, check, measured, strong }: CheckRowProps) {
    const f = useFormatters()
    const t = useTranslations("risk.constraint")
    const violated = check.status === "VIOLATED"

    return (
        <TableRow variant="static">
            <TableCell variant={strong ? "strong" : "default"}>{label}</TableCell>
            <TableCell className="text-right">{f.formatRate(check.limit)}</TableCell>
            <TableCell className={cn("text-right", violated && "text-destructive")}>
                {f.formatPercent1(measured)}
            </TableCell>
            <TableCell className="text-right">
                <Badge variant={violated ? "destructive" : "success"}>{t(violated ? "violated" : "respected")}</Badge>
            </TableCell>
        </TableRow>
    )
}
