"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { NumberField } from "@/components/form/fields/number-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldError } from "@/components/ui/field"
import { useFormatters } from "@/lib/format"
import { DAYS_PER_YEAR } from "./constants"
import { createOptionSchema, type OptionFormValues } from "./schema"

type OptionFormProps = {
    defaults: Partial<OptionFormValues>
    onSubmit: (values: OptionFormValues) => void
    pending: boolean
    notice?: string // préremplissage impossible : saisie manuelle
    error?: string // erreur de l'API (saisie refusée, demande non publiée)
}

/** Carte « Paramètres » (maquette 36) : spot, strike, maturité en jours, taux, dividende continu q et volatilité, préremplis et modifiables. */
export function OptionForm({ defaults, onSubmit, pending, notice, error }: OptionFormProps) {
    const f = useFormatters()
    const t = useTranslations("pages.options")
    const form = useForm<OptionFormValues>({ resolver: zodResolver(createOptionSchema(t)), defaultValues: defaults })
    const days = useWatch({ control: form.control, name: "maturityDays" })
    const years = Number.isFinite(days) ? f.formatYears(days / DAYS_PER_YEAR) : undefined

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
                            <NumberField<OptionFormValues> name="spot" label={t("form.spot")} />
                            <NumberField<OptionFormValues> name="strike" label={t("form.strike")} />
                            <NumberField<OptionFormValues>
                                name="maturityDays"
                                label={t("form.maturity")}
                                description={years}
                            />
                            <NumberField<OptionFormValues> name="rate" label={t("form.rate")} />
                            <NumberField<OptionFormValues> name="dividendYield" label={t("form.dividendYield")} />
                            <NumberField<OptionFormValues>
                                name="volatility"
                                label={t("form.volatility")}
                                hint="optionVolatility"
                                description={defaults.volatility == null ? undefined : t("form.volatilityHint")}
                            />
                        </div>
                        <p className="text-small text-muted-foreground">{t("form.note")}</p>
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
