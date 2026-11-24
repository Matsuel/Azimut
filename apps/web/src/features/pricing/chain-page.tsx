"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/page-layout"
import { LoadingState } from "@/components/query-status"
import { StateCard } from "@/components/state-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useApiErrorMessages } from "@/lib/api-error"
import { useFormatters } from "@/lib/format"
import { routes } from "@/lib/routes"
import { ChainStats } from "./chain-stats"
import { ChainTable } from "./chain-table"
import { GreeksCard } from "./greeks-card"
import { useChainPricing } from "./hook"
import { OptionsTabs } from "./options-tabs"
import { SmileChart } from "./smile-chart"

/**
 * Page « Grecques et smile » (maquette 37) : calcule la chaîne du symbole (`POST` puis `GET /api/pricing/:id`, `OPTION_CHAIN`) à
 * l'ouverture, puis affiche volatilité implicite, grecques, smile et chaîne telles que calculées par le moteur. Sans symbole, invite
 * à en choisir un.
 */
export function OptionChainPage({ symbol }: { symbol: string | null }) {
    const t = useTranslations("pages.optionChain")
    const f = useFormatters()
    const { errorMessage } = useApiErrorMessages()
    const pricing = useChainPricing(symbol)
    const { result, view } = pricing

    return (
        <>
            <PageHeader
                title={symbol ? t("titleSymbol", { symbol }) : t("title")}
                badge={result && <Badge variant="outline">{t("badge", { date: f.formatDay(result.asOf) })}</Badge>}
                description={t("description")}
                actions={
                    <>
                        <Button variant="outline" nativeButton={false} render={<Link href={routes.market} />}>
                            {t("changeSymbol")}
                        </Button>
                        <Button onClick={pricing.recompute} disabled={!symbol || pricing.pending}>
                            {t("recompute")}
                        </Button>
                    </>
                }
            />
            <OptionsTabs active="chain" symbol={symbol} />
            {!symbol && <StateCard message={t("states.noSymbol")} />}
            {symbol && result && (
                <>
                    <ChainStats chain={result} />
                    <div className="grid gap-6 xl:grid-cols-2">
                        <SmileChart chain={result} />
                        <GreeksCard chain={result} />
                    </div>
                    <ChainTable chain={result} />
                </>
            )}
            {symbol && !result && (
                <>
                    {pricing.pending && <LoadingState className="h-64" />}
                    {pricing.createError && <StateCard error message={errorMessage(pricing.createError)} />}
                    {pricing.readFailed && <StateCard error message={t("states.readError")} />}
                    {view?.status === "FAILED" && (
                        <StateCard error message={t("states.failed", { reason: view.error ?? "" })} />
                    )}
                </>
            )}
        </>
    )
}
