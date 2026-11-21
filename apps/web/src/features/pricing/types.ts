// Courbe des taux (GET /api/market/rates) : taux en ratio annuel (0,0421 = 4,21 %), maturités en années
// Demande de pricing (POST /api/pricing, GET /api/pricing/:id) : montants en EUR, durations en années
export type {
    BondFlow,
    BondInput,
    BondResult,
    PricingInput,
    PricingResult,
    PricingStatus,
    PricingView,
    RateCurve,
    RateCurvePoint,
} from "@azimut/contracts"
