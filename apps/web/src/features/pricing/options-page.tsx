"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { LoadingState } from "@/components/query-status"
import { StateCard } from "@/components/state-card"
import { useApiErrorMessages } from "@/lib/api-error"
import { OPTION_DEFAULT_CURRENCY } from "./constants"
import { useCreatePricing, useOptionInputs, usePricing, useRateCurve } from "./hook"
import { OptionCards } from "./option-cards"
import { OptionForm } from "./option-form"
import { OptionsHeader } from "./options-header"
import { OptionsTabs } from "./options-tabs"
import { ParityCard } from "./parity-card"
import { PayoffChart } from "./payoff-chart"
import { PayoffGrid } from "./payoff-grid"
import type { OptionFormValues } from "./schema"
import { optionDefaults, toOptionPricingInput } from "./utils"

// Demande en cours de l'écran : lancement, lecture du résultat, et remise à zéro (la clé remonte le formulaire à ses valeurs de départ)
function useOptionPricing(prefilledVolatility: number | undefined) {
    const [request, setRequest] = useState<{ id: string; historical: boolean } | null>(null)
    const [formKey, setFormKey] = useState(0)
    const create = useCreatePricing()
    const query = usePricing(request?.id ?? null)
    const view = query.data
    const input = view?.input.kind === "OPTION" ? view.input.option : null
    const result = view?.status === "COMPLETED" && view.result?.kind === "OPTION" ? view.result.option : null

    return {
        view,
        input,
        result,
        historical: request?.historical ?? false,
        readFailed: query.isError,
        createError: create.isError ? create.error : null,
        pending: create.isPending || view?.status === "PENDING",
        formKey,
        // Volatilité inchangée depuis le préremplissage : le badge de la carte annonce « historique »
        submit: (values: OptionFormValues) =>
            create.mutate(toOptionPricingInput(values), {
                onSuccess: (created) =>
                    setRequest({ id: created.id, historical: values.volatility === prefilledVolatility }),
            }),
        reset: () => {
            setRequest(null)
            setFormKey((key) => key + 1)
            create.reset()
        },
    }
}

/**
 * Page Options (maquette 36) : formulaire d'option européenne prérempli (`GET /api/market/option-inputs` pour le symbole,
 * taux 13 semaines de `GET /api/market/rates`), puis résultat de la demande de pricing (`POST` puis `GET /api/pricing/:id`,
 * rafraîchie tant qu'elle est `PENDING`). Sans symbole, ou si le préremplissage échoue, tout se saisit à la main.
 */
export function OptionsPage({ symbol }: { symbol: string | null }) {
    const t = useTranslations("pages.options")
    const { errorMessage } = useApiErrorMessages()
    const inputs = useOptionInputs(symbol)
    const curve = useRateCurve()
    const defaults = optionDefaults(inputs.data, curve.data)
    const pricing = useOptionPricing(defaults.volatility)
    const currency = inputs.data?.currency ?? OPTION_DEFAULT_CURRENCY
    const { input, result } = pricing
    const loading = curve.isPending || (symbol !== null && inputs.isPending)

    return (
        <>
            <OptionsHeader symbol={symbol} input={input} currency={currency} onReset={pricing.reset} />
            <OptionsTabs active="calculator" symbol={symbol} />
            {loading ? (
                <LoadingState className="h-64" />
            ) : (
                <>
                    {result && input && (
                        <OptionCards
                            result={result}
                            volatility={input.volatility}
                            currency={currency}
                            historical={pricing.historical}
                        />
                    )}
                    <div className="grid gap-6 xl:grid-cols-2">
                        <OptionForm
                            key={`${symbol}-${pricing.formKey}`}
                            defaults={defaults}
                            onSubmit={pricing.submit}
                            pending={pricing.pending}
                            notice={symbol && inputs.isError ? t("states.prefillError", { symbol }) : undefined}
                            error={pricing.createError ? errorMessage(pricing.createError) : undefined}
                        />
                        {result && input ? (
                            <PayoffChart result={result} strike={input.strike} currency={currency} />
                        ) : (
                            <ResultState view={pricing.view} readFailed={pricing.readFailed} />
                        )}
                    </div>
                    {result && (
                        <div className="grid gap-6 xl:grid-cols-2">
                            <ParityCard result={result} currency={currency} />
                            <PayoffGrid result={result} currency={currency} />
                        </div>
                    )}
                </>
            )}
        </>
    )
}

// Carte d'état de la zone résultat : rien demandé, calcul en cours, échec du calcul ou de la lecture
function ResultState({ view, readFailed }: { view: ReturnType<typeof useOptionPricing>["view"]; readFailed: boolean }) {
    const t = useTranslations("pages.options.states")
    if (readFailed) return <StateCard error message={t("readError")} />
    if (view?.status === "PENDING") return <StateCard message={t("pending")} />
    if (view?.status === "FAILED") return <StateCard error message={t("failed", { reason: view.error ?? "" })} />
    return <StateCard message={t("empty")} />
}
