import { useState } from "react"
import { useCreatePricing, usePricing } from "../pricing/hook"
import type { StructuredFormValues } from "./schema"
import { structuredOf, toStructuredPricingInput } from "./utils"

/**
 * Demande en cours de l'écran : lancement (`POST /api/pricing`, kind STRUCTURED), lecture de la demande (rafraîchie tant qu'elle est
 * `PENDING`) et remise à zéro. La saisie et le résultat d'une même demande sont lus ensemble : ils décrivent le produit affiché.
 */
export function useStructuredPricing() {
    const [id, setId] = useState<string | null>(null)
    const create = useCreatePricing()
    const query = usePricing(id)
    const view = query.data

    return {
        view,
        ...(structuredOf(view) ?? { input: null, result: null }),
        readFailed: query.isError,
        createError: create.isError ? create.error : null,
        pending: create.isPending || view?.status === "PENDING",
        submit: (values: StructuredFormValues) =>
            create.mutate(toStructuredPricingInput(values), { onSuccess: (created) => setId(created.id) }),
    }
}
