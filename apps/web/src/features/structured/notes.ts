import { useTranslations } from "next-intl"
import { useFormatters } from "@/lib/format"
import { STRUCTURED_CURRENCY } from "./constants"
import type { StructuredInput, StructuredResult } from "./types"

/**
 * Phrases de bas de carte de l'écran, composées des valeurs reçues du moteur (participation, briques, prime, probabilités) : le web
 * les formate sans les calculer. Un résultat et sa saisie de produits différents ne se croisent pas : `input.product === result.product`.
 */
export function useStructuredNotes() {
    const f = useFormatters()
    const t = useTranslations("pages.structured")
    const money = (value: number) => f.formatPrice(value, STRUCTURED_CURRENCY)
    const brick = (result: StructuredResult, type: string) => result.bricks.find((b) => b.type === type)?.value ?? 0

    return {
        /** Note de la carte Décomposition : le calcul de la participation, de la juste valeur du reverse convertible, ou des briques simulées. */
        decomposition(result: StructuredResult, input: StructuredInput): string {
            if (result.product === "CAPITAL_GUARANTEED") {
                return t("decomposition.notes.CAPITAL_GUARANTEED", {
                    budget: money(result.optionBudget),
                    call: money(result.callPrice),
                    participation: f.formatRate(result.participation),
                })
            }
            if (result.product === "REVERSE_CONVERTIBLE") {
                return t("decomposition.notes.REVERSE_CONVERTIBLE", {
                    coupon: f.formatPercent1("couponRate" in input ? input.couponRate : 0),
                    bond: money(brick(result, "BOND")),
                    put: money(result.putPrice),
                    fairValue: money(result.fairValue),
                })
            }
            return t("decomposition.notes.AUTOCALLABLE", {
                paths: f.formatDecimal1(result.paths),
                zeroCoupon: money(brick(result, "ZERO_COUPON")),
                net: money(brick(result, "AUTOCALL_NET_COUPONS")),
                fairValue: money(result.fairValue),
            })
        },
        /** Note de la carte Payoff : ce que reçoit le client selon le sous-jacent à l'échéance. */
        payoff(result: StructuredResult, input: StructuredInput): string {
            const years = input.maturityYears
            if (result.product === "CAPITAL_GUARANTEED") {
                return t("payoff.notes.CAPITAL_GUARANTEED", {
                    capital: money(result.payoff[0]?.payoff ?? 0),
                    participation: f.formatRate(result.participation),
                })
            }
            if (input.product === "REVERSE_CONVERTIBLE") {
                return t("payoff.notes.REVERSE_CONVERTIBLE", {
                    years,
                    coupon: f.formatPercent1(input.couponRate),
                    total: money(result.payoff.at(-1)?.payoff ?? 0),
                    strike: f.formatRate(input.putStrike),
                })
            }
            if (input.product !== "AUTOCALLABLE") return ""
            return t("payoff.notes.AUTOCALLABLE", {
                years,
                coupon: f.formatPercent1(input.couponRate),
                barrier: f.formatRate(input.protectionBarrier),
                recall: f.formatRate(input.recallLevel),
            })
        },
    }
}
