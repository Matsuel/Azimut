"use client"

import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useFormatters } from "@/lib/format"
import type { OptionMonteCarloResult } from "./types"
import { toMaturityDays } from "./utils"

type MonteCarloHeaderProps = {
    symbol: string | null
    input: { strike: number; maturityYears: number } | null // demande affichée : sa description reprend strike et maturité
    result: OptionMonteCarloResult | null // trajectoires et graine de la demande terminée
    currency: string
    onReset: () => void
}

/** En-tête de la page Pricing Monte Carlo (maquette 38) : titre avec symbole, badge du modèle, description de la demande (strike, maturité, trajectoires, seed) et « Réinitialiser ». */
export function MonteCarloHeader({ symbol, input, result, currency, onReset }: MonteCarloHeaderProps) {
    const f = useFormatters()
    const t = useTranslations("pages.optionMonteCarlo")

    return (
        <PageHeader
            title={symbol ? t("titleSymbol", { symbol }) : t("title")}
            badge={<Badge variant="outline">{t("badge")}</Badge>}
            description={
                input && result
                    ? t("description", {
                          strike: f.formatPrice(input.strike, currency),
                          maturity: f.formatDays(toMaturityDays(input.maturityYears)),
                          paths: f.formatDecimal1(result.paths),
                          seed: result.seed,
                      })
                    : t("descriptionEmpty")
            }
            actions={
                <Button variant="outline" onClick={onReset}>
                    {t("reset")}
                </Button>
            }
        />
    )
}
