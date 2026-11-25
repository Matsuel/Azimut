"use client"

import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { useFormatters } from "@/lib/format"
import { STRUCTURED_CURRENCY, STRUCTURED_UNDERLYINGS } from "./constants"
import type { StructuredInput, StructuredProduct } from "./types"

type StructuredHeaderProps = {
    product: StructuredProduct // type affiché en badge : celui de la demande, sinon celui du sélecteur
    input: StructuredInput | null // demande affichée : sa description reprend sous-jacent, maturité, nominal et date
}

/** En-tête de la page Structuration (maquette 39) : titre, badge du type de produit et description de la demande (sous-jacent, maturité, nominal, date des données). */
export function StructuredHeader({ product, input }: StructuredHeaderProps) {
    const f = useFormatters()
    const t = useTranslations("pages.structured")

    return (
        <PageHeader
            title={t("title")}
            badge={<Badge variant="outline">{t(`products.${product}`)}</Badge>}
            description={
                input
                    ? t("description", {
                          underlying:
                              STRUCTURED_UNDERLYINGS.find((u) => u.value === input.underlying)?.label ??
                              input.underlying,
                          maturity: f.formatYears(input.maturityYears),
                          nominal: f.formatPrice(input.nominal, STRUCTURED_CURRENCY),
                          date: f.formatMediumDate(input.valueDate),
                      })
                    : t("descriptionEmpty")
            }
        />
    )
}
