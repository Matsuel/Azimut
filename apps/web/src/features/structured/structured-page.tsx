"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { StateCard } from "@/components/state-card"
import { useApiErrorMessages } from "@/lib/api-error"
import { DecompositionCard } from "./decomposition-card"
import { useStructuredPricing } from "./hook"
import { ObservationsCard } from "./observations-card"
import { PayoffCard } from "./payoff-card"
import { StructuredCards } from "./structured-cards"
import { StructuredForm } from "./structured-form"
import { StructuredHeader } from "./structured-header"
import type { StructuredProduct } from "./types"

// Carte d'état de la zone résultat : rien demandé, calcul en cours, échec du calcul ou de la lecture
function ResultState({ view, readFailed }: Pick<ReturnType<typeof useStructuredPricing>, "view" | "readFailed">) {
    const t = useTranslations("pages.structured.states")
    if (readFailed) return <StateCard error message={t("readError")} />
    if (view?.status === "PENDING") return <StateCard message={t("pending")} />
    if (view?.status === "FAILED") return <StateCard error message={t("failed", { reason: view.error ?? "" })} />
    return <StateCard message={t("empty")} />
}

/**
 * Page Structuration (maquette 39) : constructeur d'un produit structuré. Le formulaire lance une demande `STRUCTURED`
 * (`POST` puis `GET /api/pricing/:id`, rafraîchie tant qu'elle est `PENDING`) ; l'écran affiche juste valeur, marge, briques,
 * payoff et, pour l'autocallable, les dates d'observation, tels que calculés par le moteur.
 */
export function StructuredPage() {
    const { errorMessage } = useApiErrorMessages()
    const [product, setProduct] = useState<StructuredProduct>("CAPITAL_GUARANTEED")
    const pricing = useStructuredPricing()
    const { input, result } = pricing

    return (
        <>
            <StructuredHeader product={result?.product ?? product} input={input} />
            {result && input && <StructuredCards result={result} input={input} />}
            <div className="grid gap-6 xl:grid-cols-2">
                <StructuredForm
                    product={product}
                    onProductChange={setProduct}
                    onSubmit={pricing.submit}
                    pending={pricing.pending}
                    error={pricing.createError ? errorMessage(pricing.createError) : undefined}
                />
                {result && input ? (
                    <DecompositionCard result={result} input={input} />
                ) : (
                    <ResultState view={pricing.view} readFailed={pricing.readFailed} />
                )}
            </div>
            {result && input && (
                <div className="grid gap-6 xl:grid-cols-2">
                    {result.product === "AUTOCALLABLE" && <ObservationsCard result={result} input={input} />}
                    <PayoffCard result={result} input={input} />
                </div>
            )}
        </>
    )
}
