// Courbe des taux (GET /api/market/rates) : taux en ratio annuel (0,0421 = 4,21 %), maturités en années
// Demande de pricing (POST /api/pricing, GET /api/pricing/:id) : montants d'une obligation en EUR, durations en années ;
// montants d'une option dans la devise du sous-jacent, ratios annuels
// Chaîne d'options (POST /api/pricing, kind OPTION_CHAIN) : volatilités en ratio annuel, grecques en devise du sous-jacent (voir `optionGreeksSchema`)
// Pricing Monte Carlo (POST /api/pricing, kind OPTION_MC) : prix et erreurs standard dans la devise du sous-jacent, `steps` en jours
// Valeurs de préremplissage d'une option (GET /api/market/option-inputs) : spot en devise principale, ratios annuels
export type {
    BondFlow,
    BondInput,
    BondResult,
    ChainRow,
    OptionChainResult,
    OptionGreeks,
    OptionInput,
    OptionInputs,
    OptionMonteCarloResult,
    OptionPrice,
    OptionResult,
    PayoffPoint,
    PricingInput,
    PricingResult,
    PricingStatus,
    PricingView,
    QuoteStatus,
    RateCurve,
    RateCurvePoint,
    SmileCurve,
} from "@azimut/contracts"
