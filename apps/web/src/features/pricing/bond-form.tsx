"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form"
import { FilterTabs } from "@/components/filter-tabs"
import { DateField } from "@/components/form/fields/date-field"
import { NumberField } from "@/components/form/fields/number-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { BOND_TYPES, DEFAULT_BOND, DISCOUNT_SOURCES } from "./constants"
import { type BondFormValues, createBondSchema } from "./schema"

type BondFormProps = {
    onSubmit: (values: BondFormValues) => void
    pending: boolean
    error?: string // erreur de l'API (saisie refusée, demande non publiée)
}

/** Carte « Prix d'une obligation » (maquette 35) : type, nominal, coupon, maturité, date de valeur, taux d'actualisation. */
export function BondForm({ onSubmit, pending, error }: BondFormProps) {
    const t = useTranslations("pages.rates")
    const form = useForm<BondFormValues>({
        resolver: zodResolver(createBondSchema(t)),
        defaultValues: { ...DEFAULT_BOND, valueDate: new Date() },
    })
    const type = useWatch({ control: form.control, name: "type" })
    const source = useWatch({ control: form.control, name: "discountSource" })

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("form.title")}</CardTitle>
                <CardDescription>{t("form.description")}</CardDescription>
            </CardHeader>
            <CardContent>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                        <Choice
                            name="type"
                            label={t("form.type")}
                            values={BOND_TYPES}
                            labels={(v) => t(`form.types.${v}`)}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <NumberField<BondFormValues> name="nominal" label={t("form.nominal")} />
                            <NumberField<BondFormValues>
                                name="couponRate"
                                label={t("form.coupon")}
                                disabled={type === "ZERO"}
                                description={type === "ZERO" ? t("form.zeroHint") : undefined}
                            />
                            <NumberField<BondFormValues> name="maturityYears" label={t("form.maturity")} />
                            <DateField<BondFormValues> name="valueDate" label={t("form.valueDate")} />
                        </div>
                        <Choice
                            name="discountSource"
                            label={t("form.discount")}
                            values={DISCOUNT_SOURCES}
                            labels={(v) => t(`form.discounts.${v}`)}
                        />
                        {source === "FLAT" && (
                            <NumberField<BondFormValues>
                                name="flatRate"
                                label={t("form.flatRate")}
                                description={t("form.flatHint")}
                            />
                        )}
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

type ChoiceProps<V extends string> = {
    name: "type" | "discountSource"
    label: string
    values: readonly V[]
    labels: (value: V) => string
}

// Choix entre deux valeurs (onglets) lié au formulaire courant
function Choice<V extends string>({ name, label, values, labels }: ChoiceProps<V>) {
    return (
        <Controller<BondFormValues>
            name={name}
            render={({ field }) => (
                <Field>
                    <FieldLabel>{label}</FieldLabel>
                    <FilterTabs
                        value={field.value as V}
                        onChange={field.onChange}
                        options={values.map((value) => ({ value, label: labels(value) }))}
                    />
                </Field>
            )}
        />
    )
}
