"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { LoadingState } from "@/components/query-status"
import { StateCard } from "@/components/state-card"
import { useApiErrorMessages } from "@/lib/api-error"
import { OPTION_DEFAULT_CURRENCY } from "./constants"
import { ConvergenceChart } from "./convergence-chart"
import { useCreatePricing, useOptionInputs, usePricing, useRateCurve } from "./hook"
import { MethodsTable } from "./methods-table"
import { MonteCarloCards } from "./monte-carlo-cards"
import { MonteCarloForm } from "./monte-carlo-form"
import { MonteCarloHeader } from "./monte-carlo-header"
import { OptionsTabs } from "./options-tabs"
import type { MonteCarloFormValues } from "./schema"
import { TrajectoriesChart } from "./trajectories-chart"
import { monteCarloDefaults, toMonteCarloPricingInput } from "./utils"

// Demande en cours de l'écran : lancement, lecture du résultat, et remise à zéro (la clé remonte le formulaire à ses valeurs de départ)
function useMonteCarloPricing() {
    const [id, setId] = useState<string | null>(null)
    const [formKey, setFormKey] = useState(0)
    const create = useCreatePricing()
    const query = usePricing(id)
    const view = query.data
    const input = view?.input.kind === "OPTION_MC" ? view.input.monteCarlo : null
    const result = view?.status === "COMPLETED" && view.result?.kind === "OPTION_MC" ? view.result.monteCarlo : null

    return {
        view,
        input,
        result,
        readFailed: query.isError,
        createError: create.isError ? create.error : null,
        pending: create.isPending || view?.status === "PENDING",
        formKey,
        submit: (values: MonteCarloFormValues) =>
            create.mutate(toMonteCarloPricingInput(values), { onSuccess: (created) => setId(created.id) }),
        reset: () => {
            setId(null)
            setFormKey((key) => key + 1)
            create.reset()
        },
    }
}

/**
 * Page Pricing Monte Carlo (maquette 38) : formulaire prérempli comme le calculateur (`GET /api/market/option-inputs`, taux 13 semaines),
 * puis résultat de la demande `OPTION_MC` (`POST` puis `GET /api/pricing/:id`, rafraîchie tant qu'elle est `PENDING`) : prix et erreurs
 * standard, trajectoires, convergence et comparaison à Black-Scholes, tels que calculés par le moteur.
 */
export function MonteCarloPage({ symbol }: { symbol: string | null }) {
    const t = useTranslations("pages.optionMonteCarlo")
    const { errorMessage } = useApiErrorMessages()
    const inputs = useOptionInputs(symbol)
    const curve = useRateCurve()
    const defaults = monteCarloDefaults(inputs.data, curve.data)
    const pricing = useMonteCarloPricing()
    const currency = inputs.data?.currency ?? OPTION_DEFAULT_CURRENCY
    const { input, result } = pricing
    const loading = curve.isPending || (symbol !== null && inputs.isPending)

    return (
        <>
            <MonteCarloHeader
                symbol={symbol}
                input={input}
                result={result}
                currency={currency}
                onReset={pricing.reset}
            />
            <OptionsTabs active="monteCarlo" symbol={symbol} />
            {loading ? (
                <LoadingState className="h-64" />
            ) : (
                <>
                    {result && <MonteCarloCards result={result} currency={currency} />}
                    <div className="grid gap-6 xl:grid-cols-2">
                        <MonteCarloForm
                            key={`${symbol}-${pricing.formKey}`}
                            defaults={defaults}
                            onSubmit={pricing.submit}
                            pending={pricing.pending}
                            notice={symbol && inputs.isError ? t("states.prefillError", { symbol }) : undefined}
                            error={pricing.createError ? errorMessage(pricing.createError) : undefined}
                        />
                        {result && input ? (
                            <TrajectoriesChart result={result} strike={input.strike} currency={currency} />
                        ) : (
                            <ResultState view={pricing.view} readFailed={pricing.readFailed} />
                        )}
                    </div>
                    {result && (
                        <div className="grid gap-6 xl:grid-cols-2">
                            <ConvergenceChart result={result} currency={currency} />
                            <MethodsTable result={result} currency={currency} />
                        </div>
                    )}
                </>
            )}
        </>
    )
}

// Carte d'état de la zone résultat : rien demandé, calcul en cours, échec du calcul ou de la lecture
function ResultState({
    view,
    readFailed,
}: {
    view: ReturnType<typeof useMonteCarloPricing>["view"]
    readFailed: boolean
}) {
    const t = useTranslations("pages.optionMonteCarlo.states")
    if (readFailed) return <StateCard error message={t("readError")} />
    if (view?.status === "PENDING") return <StateCard message={t("pending")} />
    if (view?.status === "FAILED") return <StateCard error message={t("failed", { reason: view.error ?? "" })} />
    return <StateCard message={t("empty")} />
}
