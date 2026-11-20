"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { PageHeader } from "@/components/page-layout"
import { LoadingState } from "@/components/query-status"
import { StateCard } from "@/components/state-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useApiErrorMessages } from "@/lib/api-error"
import { useFormatters } from "@/lib/format"
import { BondForm } from "./bond-form"
import { BondResultCard } from "./bond-result"
import { useCreatePricing, usePricing, useRateCurve } from "./hook"
import { PricingMethod } from "./pricing-method"
import { RateCards } from "./rate-cards"
import { RateCurveChart } from "./rate-curve-chart"
import { toPricingInput } from "./utils"

// Demande en cours de l'écran : lancement, lecture du résultat, et remise à zéro (la clé remonte le formulaire à sa saisie initiale)
function useBondPricing() {
    const [requestId, setRequestId] = useState<string | null>(null)
    const [formKey, setFormKey] = useState(0)
    const create = useCreatePricing()
    const query = usePricing(requestId)
    const view = query.data
    const bond = view?.status === "COMPLETED" && view.result?.kind === "BOND" ? view.result.bond : null
    const maturityYears = view?.input.kind === "BOND" ? view.input.bond.maturityYears : null

    return {
        view,
        bond,
        readFailed: query.isError,
        createError: create.isError ? create.error : null,
        pending: create.isPending || view?.status === "PENDING",
        formKey,
        // Seul un résultat à taux de courbe a un point interpolé à tracer
        interpolated:
            bond?.discountSource === "CURVE" && maturityYears ? { maturityYears, rate: bond.rate } : undefined,
        submit: (values: Parameters<typeof toPricingInput>[0]) =>
            create.mutate(toPricingInput(values), { onSuccess: (created) => setRequestId(created.id) }),
        reset: () => {
            setRequestId(null)
            setFormKey((key) => key + 1)
            create.reset()
        },
    }
}

/**
 * Page Taux et obligations (maquette 35) : courbe des taux US telle que reçue de `GET /api/market/rates`, formulaire
 * d'obligation, puis résultat de la demande de pricing (`POST` puis `GET /api/pricing/:id`, rafraîchie tant qu'elle est
 * `PENDING`). « Réinitialiser » oublie la demande et remet le formulaire à sa saisie initiale.
 */
export function RatesPage() {
    const f = useFormatters()
    const t = useTranslations("pages.rates")
    const { errorMessage } = useApiErrorMessages()
    const curve = useRateCurve()
    const pricing = useBondPricing()
    const date = curve.data?.points
        .map((p) => p.date)
        .sort()
        .at(-1)

    return (
        <>
            <PageHeader
                title={t("title")}
                badge={<Badge variant="outline">{t("badge")}</Badge>}
                description={date ? t("description", { date: f.formatDay(date) }) : undefined}
                actions={
                    <Button variant="outline" onClick={pricing.reset}>
                        {t("reset")}
                    </Button>
                }
            />
            {curve.isPending && <LoadingState className="h-64" />}
            {curve.isError && (
                <StateCard
                    error
                    message={errorMessage(curve.error) || t("states.curveError")}
                    action={
                        <Button variant="outline" onClick={() => curve.refetch()}>
                            {t("retry")}
                        </Button>
                    }
                />
            )}
            {curve.data && (
                <>
                    <RateCards curve={curve.data} />
                    <div className="grid gap-4 xl:grid-cols-2">
                        <RateCurveChart curve={curve.data} interpolated={pricing.interpolated} />
                        <BondForm
                            key={pricing.formKey}
                            onSubmit={pricing.submit}
                            pending={pricing.pending}
                            error={pricing.createError ? errorMessage(pricing.createError) : undefined}
                        />
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                        {pricing.bond && pricing.view ? (
                            <BondResultCard view={pricing.view} />
                        ) : (
                            <ResultState view={pricing.view} readFailed={pricing.readFailed} />
                        )}
                        <PricingMethod curve={curve.data} bond={pricing.bond} />
                    </div>
                </>
            )}
        </>
    )
}

// Carte d'état de la zone résultat : rien demandé, calcul en cours, échec du calcul ou de la lecture
function ResultState({ view, readFailed }: { view: ReturnType<typeof useBondPricing>["view"]; readFailed: boolean }) {
    const t = useTranslations("pages.rates.states")
    if (readFailed) return <StateCard error message={t("readError")} />
    if (view?.status === "PENDING") return <StateCard message={t("pending")} />
    if (view?.status === "FAILED") return <StateCard error message={t("failed", { reason: view.error ?? "" })} />
    return <StateCard message={t("empty")} />
}
