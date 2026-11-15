import type { useTranslations } from "next-intl"
import { z } from "zod"
import { RISK_LIMIT_PERCENT } from "./constants"

export type RiskTranslator = ReturnType<typeof useTranslations<"risk">>

/** Limite de drawdown saisie : entier de 1 à 99 (pourcent), vide refusé ; convertie en ratio à l'envoi. */
export function createRiskLimitSchema(t: RiskTranslator) {
    const message = t("constraint.invalid")
    return z.object({
        limit: z
            .number({ error: message })
            .int({ error: message })
            .min(RISK_LIMIT_PERCENT.min, { error: message })
            .max(RISK_LIMIT_PERCENT.max, { error: message }),
    })
}

export type RiskLimitValues = z.infer<ReturnType<typeof createRiskLimitSchema>>
