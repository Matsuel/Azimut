// Courbe des taux (GET /api/market/rates) : taux en ratio annuel (0,0421 = 4,21 %), maturités en années
// Demande de pricing (POST /api/pricing, GET /api/pricing/:id) : montants d'une obligation en EUR, durations en années ;
// montants d'une option dans la devise du sous-jacent, ratios annuels
// Valeurs de préremplissage d'une option (GET /api/market/option-inputs) : spot en devise principale, ratios annuels
export type {
    BondFlow,
    BondInput,
    BondResult,
    OptionInput,
    OptionInputs,
    OptionPrice,
    OptionResult,
    PayoffPoint,
    PricingInput,
    PricingResult,
    PricingStatus,
    PricingView,
    RateCurve,
    RateCurvePoint,
} from "@azimut/contracts"
