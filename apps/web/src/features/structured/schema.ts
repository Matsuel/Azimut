import type { useTranslations } from "next-intl"
import { z } from "zod"
import { PRODUCT_FIELDS, STRUCTURED_MATURITY_YEARS, STRUCTURED_PRODUCT_TYPES } from "./constants"

export type StructuredTranslator = ReturnType<typeof useTranslations<"pages.structured">>

/**
 * Saisie d'un produit structuré : pourcentages saisis en points (`60` = 60 %), convertis en ratios à l'envoi. Les champs propres à un
 * produit sont optionnels dans la forme, mais exigés ci-dessous pour le produit choisi ; bornes miroir du contrat, le backend reste juge.
 * Le prix client n'est pas un champ : c'est le nominal à 100 % (D5).
 */
export function createStructuredSchema(t: StructuredTranslator) {
    const field = (key: string) => ({
        error: t(`form.validation.${key}` as "form.validation.maturity", {
            min: STRUCTURED_MATURITY_YEARS.min,
            max: STRUCTURED_MATURITY_YEARS.max,
        }),
    })
    const percent = (key: string, max: number) => z.number(field(key)).gt(0, field(key)).max(max, field(key)).optional()
    return z
        .object({
            product: z.enum(STRUCTURED_PRODUCT_TYPES),
            underlying: z.string().min(1, field("underlying")),
            nominal: z.number(field("nominal")).gt(0, field("nominal")),
            maturityYears: z
                .number(field("maturity"))
                .int(field("maturity"))
                .min(STRUCTURED_MATURITY_YEARS.min, field("maturity"))
                .max(STRUCTURED_MATURITY_YEARS.max, field("maturity")),
            rate: z.number(field("rate")).min(0, field("rate")).max(100, field("rate")),
            volatility: z.number(field("volatility")).gt(0, field("volatility")).max(500, field("volatility")),
            guarantee: percent("guarantee", 100),
            callStrike: percent("strike", 200),
            couponRate: percent("coupon", 100),
            putStrike: percent("strike", 200),
            recallLevel: percent("recallLevel", 200),
            protectionBarrier: percent("barrier", 100),
        })
        .superRefine((values, context) => {
            for (const name of PRODUCT_FIELDS[values.product]) {
                if (values[name] === undefined)
                    context.addIssue({ code: "custom", path: [name], message: t("form.validation.required") })
            }
        })
}

export type StructuredFormValues = z.infer<ReturnType<typeof createStructuredSchema>>
