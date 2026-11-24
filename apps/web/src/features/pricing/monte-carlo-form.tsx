"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { FormProvider, useForm } from "react-hook-form"
import { NumberField } from "@/components/form/fields/number-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldError } from "@/components/ui/field"
import { createMonteCarloSchema, type MonteCarloFormValues } from "./schema"

type MonteCarloFormProps = {
    defaults: Partial<MonteCarloFormValues>
    onSubmit: (values: MonteCarloFormValues) => void
    pending: boolean
    notice?: string // préremplissage impossible : saisie manuelle
    error?: string // erreur de l'API (saisie refusée, demande non publiée)
}

/** Carte « Paramètres » (maquette 38) : les champs du calculateur d'option, plus la barrière et le nombre de trajectoires ; la graine est fixe, jamais saisie. */
export function MonteCarloForm({ defaults, onSubmit, pending, notice, error }: MonteCarloFormProps) {
    const t = useTranslations("pages.optionMonteCarlo")
    const form = useForm<MonteCarloFormValues>({
        resolver: zodResolver(createMonteCarloSchema(t)),
        defaultValues: defaults,
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("form.title")}</CardTitle>
                <CardDescription>{t("form.description")}</CardDescription>
            </CardHeader>
            <CardContent>
                <FormProvider {...form}>
                    {/* noValidate : la validation est celle du schéma zod, pas le `step` natif qui refuserait 224,4 */}
                    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <NumberField<MonteCarloFormValues> name="spot" label={t("form.spot")} />
                            <NumberField<MonteCarloFormValues> name="strike" label={t("form.strike")} />
                            <NumberField<MonteCarloFormValues> name="maturityDays" label={t("form.maturity")} />
                            <NumberField<MonteCarloFormValues>
                                name="volatility"
                                label={t("form.volatility")}
                                hint="optionVolatility"
                            />
                            <NumberField<MonteCarloFormValues> name="rate" label={t("form.rate")} />
                            <NumberField<MonteCarloFormValues> name="dividendYield" label={t("form.dividendYield")} />
                            <NumberField<MonteCarloFormValues>
                                name="barrier"
                                label={t("form.barrier")}
                                hint="barrierOption"
                                description={t("form.barrierHint")}
                            />
                            <NumberField<MonteCarloFormValues>
                                name="paths"
                                label={t("form.paths")}
                                hint="monteCarloPaths"
                            />
                        </div>
                        <p className="text-small text-muted-foreground">{t("form.seedNote")}</p>
                        {notice && <FieldError>{notice}</FieldError>}
                        {error && <FieldError>{error}</FieldError>}
                        <Button type="submit" disabled={pending} className="self-end">
                            {t("form.submit")}
                        </Button>
                    </form>
                </FormProvider>
            </CardContent>
        </Card>
    )
}
