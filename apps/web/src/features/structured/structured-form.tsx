"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useEffect } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { AppField } from "@/components/form/field"
import { NumberField } from "@/components/form/fields/number-field"
import { OptionSelect } from "@/components/option-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldError } from "@/components/ui/field"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    DEFAULT_COUPON_RATE,
    FIELD_HINTS,
    PRODUCT_FIELDS,
    STRUCTURED_MATURITY_YEARS,
    STRUCTURED_PRODUCT_TYPES,
} from "./constants"
import { createStructuredSchema, type StructuredFormValues } from "./schema"
import type { StructuredProduct } from "./types"
import { UnderlyingField } from "./underlying-field"
import { structuredDefaults } from "./utils"

type StructuredFormProps = {
    product: StructuredProduct
    onProductChange: (product: StructuredProduct) => void
    onUnderlyingChange: (symbol: string) => void
    market: Partial<Pick<StructuredFormValues, "volatility" | "dividendYield" | "rate">> // marché du sous-jacent, écrit dans le formulaire dès qu'il change
    onSubmit: (values: StructuredFormValues) => void
    pending: boolean
    error?: string // erreur de l'API (saisie refusée, demande non publiée)
}

// Sélecteur de type de produit
function ProductTabs({
    product,
    onChange,
}: {
    product: StructuredProduct
    onChange: (product: StructuredProduct) => void
}) {
    const t = useTranslations("pages.structured")

    return (
        <div className="flex flex-col gap-2">
            <span className="text-small-medium">{t("form.type")}</span>
            <Tabs value={product} onValueChange={(next) => onChange(next as StructuredProduct)}>
                <TabsList className="w-full">
                    {STRUCTURED_PRODUCT_TYPES.map((type) => (
                        <TabsTrigger key={type} value={type}>
                            {t(`products.${type}`)}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </div>
    )
}

/** Carte « Produit » (maquette 39) : sélecteur de type, paramètres communs puis ceux du produit choisi ; le prix client n'est pas saisi (D5). */
export function StructuredForm({
    product,
    onProductChange,
    onUnderlyingChange,
    market,
    onSubmit,
    pending,
    error,
}: StructuredFormProps) {
    const t = useTranslations("pages.structured")
    const form = useForm<StructuredFormValues>({
        resolver: zodResolver(createStructuredSchema(t)),
        defaultValues: structuredDefaults(product),
    })

    // Un nouveau sous-jacent apporte sa volatilité, son dividende et son taux ; la saisie reste modifiable ensuite
    useEffect(() => {
        for (const [name, value] of Object.entries(market)) form.setValue(name as keyof typeof market, value)
    }, [market, form])

    // Changer de type garde la saisie commune ; seul le coupon, propre à chaque produit, reprend sa valeur de départ
    const changeProduct = (next: StructuredProduct) => {
        form.setValue("product", next)
        form.setValue("couponRate", next === "CAPITAL_GUARANTEED" ? undefined : DEFAULT_COUPON_RATE[next])
        form.clearErrors()
        onProductChange(next)
    }

    const maturityOptions = Array.from(
        { length: STRUCTURED_MATURITY_YEARS.max - STRUCTURED_MATURITY_YEARS.min + 1 },
        (_, index) => {
            const years = STRUCTURED_MATURITY_YEARS.min + index
            return { value: String(years), label: t("form.maturityOption", { years }) }
        },
    )

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("form.title")}</CardTitle>
                <CardDescription>{t("form.description")}</CardDescription>
            </CardHeader>
            <CardContent>
                <FormProvider {...form}>
                    {/* noValidate : la validation est celle du schéma zod, pas le `step` natif */}
                    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                        <ProductTabs product={product} onChange={changeProduct} />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <UnderlyingField onChange={onUnderlyingChange} />
                            <AppField<StructuredFormValues> name="maturityYears" label={t("form.maturity")}>
                                {({ field, invalid }) => (
                                    <OptionSelect
                                        id={field.name}
                                        value={String(field.value ?? "")}
                                        options={maturityOptions}
                                        onChange={(value) => field.onChange(Number(value))}
                                        invalid={invalid}
                                    />
                                )}
                            </AppField>
                            <NumberField<StructuredFormValues> name="nominal" label={t("form.nominal")} />
                            {PRODUCT_FIELDS[product].map((name) => (
                                <NumberField<StructuredFormValues>
                                    key={name}
                                    name={name}
                                    label={t(`form.${name}`)}
                                    hint={
                                        name in FIELD_HINTS ? FIELD_HINTS[name as keyof typeof FIELD_HINTS] : undefined
                                    }
                                />
                            ))}
                            <NumberField<StructuredFormValues> name="rate" label={t("form.rate")} />
                            <NumberField<StructuredFormValues> name="dividendYield" label={t("form.dividendYield")} />
                            <NumberField<StructuredFormValues> name="volatility" label={t("form.volatility")} />
                        </div>
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
