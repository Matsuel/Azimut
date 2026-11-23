import type { useTranslations } from "next-intl"
import { z } from "zod"
import { BOND_MATURITY_YEARS, BOND_TYPES, DISCOUNT_SOURCES, OPTION_MATURITY_MAX_DAYS } from "./constants"

export type RatesTranslator = ReturnType<typeof useTranslations<"pages.rates">>
export type OptionsTranslator = ReturnType<typeof useTranslations<"pages.options">>

/** Saisie d'une obligation : taux en pourcent (3 = 3 %), convertis en ratios à l'envoi ; un taux plat n'est exigé que s'il est choisi. */
export function createBondSchema(t: RatesTranslator) {
    const percent = (message: string) =>
        z.number({ error: message }).min(0, { error: message }).max(100, { error: message })
    return z
        .object({
            type: z.enum(BOND_TYPES),
            nominal: z.number({ error: t("form.validation.nominal") }).gt(0, { error: t("form.validation.nominal") }),
            couponRate: percent(t("form.validation.coupon")),
            maturityYears: z
                .number({ error: t("form.validation.maturity") })
                .int({ error: t("form.validation.maturity") })
                .min(BOND_MATURITY_YEARS.min, { error: t("form.validation.maturity") })
                .max(BOND_MATURITY_YEARS.max, { error: t("form.validation.maturity") }),
            valueDate: z.date({ error: t("form.validation.valueDate") }),
            discountSource: z.enum(DISCOUNT_SOURCES),
            flatRate: z.number().optional(),
        })
        .refine((v) => v.discountSource !== "FLAT" || (v.flatRate != null && v.flatRate >= 0 && v.flatRate <= 100), {
            path: ["flatRate"],
            error: t("form.validation.flatRate"),
        })
}

export type BondFormValues = z.infer<ReturnType<typeof createBondSchema>>

/** Saisie d'une option : pourcentages (24,3 = 24,3 %) et maturité en jours, convertis à l'envoi ; bornes miroir du contrat (le backend reste juge). */
export function createOptionSchema(t: OptionsTranslator) {
    const field = (key: "spot" | "strike" | "rate" | "dividendYield" | "volatility" | "maturity") => ({
        error: t(`form.validation.${key}`, { max: OPTION_MATURITY_MAX_DAYS }),
    })
    return z.object({
        spot: z.number(field("spot")).gt(0, field("spot")),
        strike: z.number(field("strike")).gt(0, field("strike")),
        maturityDays: z
            .number(field("maturity"))
            .int(field("maturity"))
            .min(1, field("maturity"))
            .max(OPTION_MATURITY_MAX_DAYS, field("maturity")),
        rate: z.number(field("rate")).min(-10, field("rate")).max(100, field("rate")),
        dividendYield: z.number(field("dividendYield")).min(0, field("dividendYield")).max(100, field("dividendYield")),
        volatility: z.number(field("volatility")).gt(0, field("volatility")).max(500, field("volatility")),
    })
}

export type OptionFormValues = z.infer<ReturnType<typeof createOptionSchema>>
