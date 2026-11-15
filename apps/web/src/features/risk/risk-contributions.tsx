"use client"

import { useTranslations } from "next-intl"
import { InfoHint } from "@/components/info-hint"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useFormatters } from "@/lib/format"
import type { Risk, RiskReading } from "./types"

/** Carte « Contribution au risque » : part de la variance portée par chaque actif (barre) face à son poids. */
export function RiskContributions({ risk, reading }: { risk: Risk; reading: RiskReading }) {
    const f = useFormatters()
    const t = useTranslations("risk.contributions")
    const top = risk.assets.find((asset) => asset.symbol === reading.topContributor.symbol)

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <InfoHint entry="riskContribution">{t("title")}</InfoHint>
                </CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {risk.assets.map((asset) => (
                    <Progress key={asset.symbol} value={asset.riskContribution * 100} variant="chart" size="md">
                        <span className="flex-1 text-body-semibold">{asset.symbol}</span>
                        <span className="text-small text-muted-foreground">
                            {t("row", {
                                weight: f.formatRate(asset.weight),
                                risk: f.formatRate(asset.riskContribution),
                            })}
                        </span>
                    </Progress>
                ))}
                <Separator />
                <div className="flex justify-between text-body-medium">
                    <span>{t("total")}</span>
                    {/* Les contributions somment à 1 par construction (contrat `riskContribution`) */}
                    <span>{f.formatRate(1)}</span>
                </div>
                {top && (
                    <p className="text-small text-muted-foreground">
                        {t("reading", {
                            symbol: top.symbol,
                            weight: f.formatRate(top.weight),
                            risk: f.formatRate(top.riskContribution),
                        })}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
