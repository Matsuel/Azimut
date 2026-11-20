import type { PricingRequest } from "../generated/prisma/client"

// Une demande de pricing telle que stockée ; `input` et `result` sont des colonnes Json (formes `PricingInput` et `PricingResult` du contrat)
export type PricingRecord = PricingRequest
