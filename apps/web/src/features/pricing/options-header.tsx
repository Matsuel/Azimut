"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useFormatters } from "@/lib/format"
import { routes } from "@/lib/routes"
import type { OptionInput } from "./types"
import { toMaturityDays } from "./utils"

type OptionsHeaderProps = {
    symbol: string | null
    input: OptionInput | null // demande affichée : sa description reprend spot, strike et maturité
    currency: string
    onReset: () => void
}

/** En-tête de la page Options (maquette 36) : titre avec symbole, badge du modèle, description de la demande et « Réinitialiser ». */
export function OptionsHeader({ symbol, input, currency, onReset }: OptionsHeaderProps) {
    const f = useFormatters()
    const t = useTranslations("pages.options")

    return (
        <PageHeader
            title={symbol ? t("titleSymbol", { symbol }) : t("title")}
            badge={<Badge variant="outline">{t("badge")}</Badge>}
            description={
                input
                    ? t("description", {
                          spot: f.formatPrice(input.spot, currency),
                          strike: f.formatPrice(input.strike, currency),
                          maturity: f.formatDays(toMaturityDays(input.maturityYears)),
                      })
                    : t("descriptionEmpty")
            }
            actions={
                <>
                    <Button variant="outline" onClick={onReset}>
                        {t("reset")}
                    </Button>
                    {symbol && (
                        <Button nativeButton={false} render={<Link href={routes.symbolOptionsSmile(symbol)} />}>
                            {t("impliedVolatility")}
                        </Button>
                    )}
                    <Button
                        nativeButton={false}
                        render={
                            <Link href={symbol ? routes.symbolOptionsMonteCarlo(symbol) : routes.optionsMonteCarlo} />
                        }
                    >
                        {t("tabs.monteCarlo")}
                    </Button>
                </>
            }
        />
    )
}
