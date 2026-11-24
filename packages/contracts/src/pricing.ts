import { z } from "zod";
import { kafkaEventSchema } from "./event";

export const PRICING_TOPICS = {
    requested: "pricing.requested",
    completed: "pricing.completed",
    failed: "pricing.failed",
} as const;

// Produits pricés par le pipeline `pricing.*` ; le Monte Carlo (20) s'ajoute ici
export const PRICING_KINDS = ["BOND", "OPTION", "OPTION_CHAIN"] as const;

// Statuts d'une demande de pricing : créée puis publiée, calculée, ou en échec
export const PRICING_STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;

// Bornes de la maturité d'une obligation, en années entières : la courbe US s'arrête à 30 ans, pas d'extrapolation (D2)
export const BOND_MATURITY_BOUNDS = { min: 1, max: 30 } as const;

// Point de la courbe des taux : un indice Yahoo à une maturité fixe
export const rateCurvePointSchema = z.object({
    // Indice Yahoo (`^IRX`, `^FVX`, `^TNX`, `^TYX`)
    symbol: z.string().min(1),
    // Années (nombre > 0) : 0.25 pour 13 semaines
    maturityYears: z.number().gt(0),
    // Ratio annuel (0.045 = 4,5 %) : converti du pourcentage Yahoo une seule fois, par market-service (D1)
    rate: z.number(),
    // Jour de cotation du taux, YYYY-MM-DD
    date: z.iso.date(),
});

// Réponse de GET /api/market/rates : points triés par maturité croissante
export const rateCurveSchema = z.object({
    // Code ISO 4217 de la devise de la courbe ("USD")
    currency: z.string().min(1),
    points: z.array(rateCurvePointSchema).min(1),
});

// Taux d'actualisation demandé : lu sur la courbe US à la maturité de l'obligation, ou taux plat saisi (D4)
export const bondDiscountSchema = z.discriminatedUnion("source", [
    z.object({ source: z.literal("CURVE") }),
    // Ratio annuel (0.03 = 3 %)
    z.object({ source: z.literal("FLAT"), rate: z.number().min(0).max(1) }),
]);

// Obligation saisie (D8) : un coupon annuel, remboursement du nominal à la maturité ; zéro-coupon = coupon à 0
export const bondInputSchema = z.object({
    // EUR (> 0) : nominal remboursé à la maturité
    nominal: z.number().gt(0),
    // Ratio annuel du nominal (0.05 = 5 %) ; 0 pour un zéro-coupon
    couponRate: z.number().min(0).max(1),
    // Années entières entre BOND_MATURITY_BOUNDS.min et .max
    maturityYears: z.number().int().min(BOND_MATURITY_BOUNDS.min).max(BOND_MATURITY_BOUNDS.max),
    discount: bondDiscountSchema,
    // Date de départ des flux, YYYY-MM-DD ; ne sert qu'à dater les échéances, jamais au prix (D9)
    valueDate: z.iso.date(),
});

// Maturité maximale d'une option, en années : au-delà, Black-Scholes à volatilité constante n'a plus de sens
export const OPTION_MATURITY_MAX_YEARS = 30;

// Option européenne (D1) : le même jeu de paramètres price un call et un put (Black-Scholes, dividende continu q)
export const optionInputSchema = z.object({
    // Devise du sous-jacent (> 0) : cours actuel
    spot: z.number().gt(0),
    // Devise du sous-jacent (> 0) : prix d'exercice
    strike: z.number().gt(0),
    // Années (nombre > 0, 182 jours = 182 / 365) : temps restant jusqu'à l'échéance
    maturityYears: z.number().gt(0).max(OPTION_MATURITY_MAX_YEARS),
    // Ratio annuel continu (0.04 = 4 %) : taux sans risque, négatif toléré
    rate: z.number().min(-0.1).max(1),
    // Ratio annuel continu (0.005 = 0,5 %) : rendement du dividende q
    dividendYield: z.number().min(0).max(1),
    // Ratio annuel (0.243 = 24,3 %) : volatilité du sous-jacent saisie par l'utilisateur (D2)
    volatility: z.number().gt(0).max(5),
});

// Bornes de la volatilité implicite retenue (19, D2) : en dehors, le contrat est écarté
export const IMPLIED_VOLATILITY_BOUNDS = { min: 0.01, max: 3 } as const;

// Nombre d'échéances du smile (19, D4)
export const SMILE_EXPIRATIONS = 3;

// Chaîne d'options d'un sous-jacent (19) : IV, grecques et smile recalculés par le moteur
export const optionChainInputSchema = z.object({
    symbol: z.string().trim().min(1),
});

const bondPricingInputSchema = z.object({ kind: z.literal("BOND"), bond: bondInputSchema });
const optionPricingInputSchema = z.object({ kind: z.literal("OPTION"), option: optionInputSchema });
const optionChainPricingInputSchema = z.object({ kind: z.literal("OPTION_CHAIN"), chain: optionChainInputSchema });

// Demande saisie par l'utilisateur (POST /api/pricing) : un produit à la fois, discriminé par `kind`
export const pricingInputSchema = z.discriminatedUnion("kind", [bondPricingInputSchema, optionPricingInputSchema, optionChainPricingInputSchema]);

export const pricingRequestedPayloadSchema = z.discriminatedUnion("kind", [
    bondPricingInputSchema.extend({ requestId: z.string().min(1) }),
    optionPricingInputSchema.extend({ requestId: z.string().min(1) }),
    optionChainPricingInputSchema.extend({ requestId: z.string().min(1) }),
]);

export const pricingRequestedEventSchema = kafkaEventSchema(pricingRequestedPayloadSchema);

// Flux d'une échéance, actualisé
export const bondFlowSchema = z.object({
    // Années entières depuis la date de valeur (1 à maturityYears)
    year: z.number().int().min(1),
    // Échéance : date de valeur + `year` ans, YYYY-MM-DD
    date: z.iso.date(),
    // EUR : coupon, plus le nominal à la dernière échéance
    cashFlow: z.number(),
    // Ratio : 1 / (1 + taux)^year
    discountFactor: z.number(),
    // EUR : cashFlow × discountFactor
    presentValue: z.number(),
});

export const bondResultSchema = z.object({
    // Ratio annuel : taux d'actualisation effectivement utilisé (interpolé sur la courbe ou saisi)
    rate: z.number(),
    discountSource: z.enum(["CURVE", "FLAT"]),
    // Jour de cotation de la courbe utilisée, YYYY-MM-DD ; null avec un taux plat
    curveDate: z.iso.date().nullable(),
    // EUR : somme des valeurs actuelles des flux
    price: z.number(),
    // EUR : somme des flux non actualisés (coupons et nominal)
    totalCashFlow: z.number(),
    // Années : duration de Macaulay, moyenne des échéances pondérée par leur valeur actuelle
    macaulayDuration: z.number(),
    // Années : durée de Macaulay / (1 + taux)
    modifiedDuration: z.number(),
    // Ratio (−0.0485 = −4,85 %) : variation du prix pour +1 point de taux, approximation du premier ordre (−durée modifiée × 0,01)
    priceChangeOnRatePlusOnePoint: z.number(),
    flows: z.array(bondFlowSchema).min(1),
});

// Prix d'un côté (call ou put)
export const optionPriceSchema = z.object({
    // Devise du sous-jacent : prix Black-Scholes d'une action
    price: z.number(),
    // Devise du sous-jacent : valeur à l'échéance si le cours restait le spot (max(S − K, 0) pour un call, max(K − S, 0) pour un put)
    intrinsicValue: z.number(),
    // Devise du sous-jacent : prix − valeur intrinsèque
    timeValue: z.number(),
    // Devise du sous-jacent : cours final qui rembourse la prime (K + prime pour un call, K − prime pour un put)
    breakEven: z.number(),
});

// Une ligne de la grille de payoff à l'échéance, en achat d'une option
export const payoffPointSchema = z.object({
    // Devise du sous-jacent : cours final
    spot: z.number(),
    // Devise du sous-jacent : max(S − K, 0)
    callPayoff: z.number(),
    // Devise du sous-jacent : max(K − S, 0)
    putPayoff: z.number(),
    // Devise du sous-jacent : callPayoff − prime du call
    callNet: z.number(),
    // Devise du sous-jacent : putPayoff − prime du put
    putNet: z.number(),
});

export const optionResultSchema = z.object({
    call: optionPriceSchema,
    put: optionPriceSchema,
    // Devise du sous-jacent : prix du call − prix du put
    callMinusPut: z.number(),
    // Devise du sous-jacent : S·e^(−qT) − K·e^(−rT), second membre de la parité call-put
    parityRight: z.number(),
    // Devise du sous-jacent : callMinusPut − parityRight, nul à l'arrondi près si le moteur est cohérent
    parityGap: z.number(),
    // Booléen : |parityGap| sous la tolérance du moteur (1e-6) ; décidé par le moteur seul, le web l'affiche. Absent d'un résultat stocké avant son ajout
    parityVerified: z.boolean().optional(),
    // Du plus petit au plus grand cours final, 21 points entre 0,7 × min(spot, strike) et 1,3 × max(spot, strike)
    payoffGrid: z.array(payoffPointSchema).min(2),
});

// Sensibilités d'une option par action, hors dividende discret (19, D1)
export const optionGreeksSchema = z.object({
    // Sans unité : variation du prix pour +1 de spot (call dans [0, 1], put dans [−1, 0])
    delta: z.number(),
    // 1 / devise du sous-jacent : variation du delta pour +1 de spot
    gamma: z.number(),
    // Devise du sous-jacent : variation du prix pour +1 point de volatilité (0,01)
    vega: z.number(),
    // Devise du sous-jacent : variation du prix par jour calendaire écoulé (négative pour un achat sans dividende)
    theta: z.number(),
    // Devise du sous-jacent : variation du prix pour +1 point de taux (0,01)
    rho: z.number(),
});

// Statut d'une cotation après le filtre de qualité (19, D2) : retenue, ou écartée pour une cause
export const QUOTE_STATUSES = ["KEPT", "NO_BID_ASK", "NO_PRICE", "IV_OUT_OF_BOUNDS"] as const;

// Une ligne de la chaîne d'une échéance
export const chainRowSchema = z.object({
    // Devise du sous-jacent
    strike: z.number().gt(0),
    side: z.enum(["CALL", "PUT"]),
    // Devise du sous-jacent : meilleure offre d'achat ; 0 sans offre
    bid: z.number().min(0),
    // Devise du sous-jacent : meilleure offre de vente ; 0 sans offre
    ask: z.number().min(0),
    // Devise du sous-jacent : (bid + ask) / 2 ; null si bid ou ask est nul
    mid: z.number().gt(0).nullable(),
    // Ratio annuel (0.186 = 18,6 %) : calculé par le moteur sur le prix milieu ; null si la cotation est écartée
    impliedVolatility: z.number().gt(0).nullable(),
    // Ratio annuel : volatilité de Yahoo, pour comparaison seulement ; null si absente
    yahooVolatility: z.number().min(0).nullable(),
    status: z.enum(QUOTE_STATUSES),
    // Grecques au prix milieu ; null si la cotation est écartée
    greeks: optionGreeksSchema.nullable(),
});

// Un point du smile : un strike hors de la monnaie (put sous le spot, call au-dessus) retenu par le filtre
export const smilePointSchema = z.object({
    // Devise du sous-jacent
    strike: z.number().gt(0),
    // Ratio annuel : volatilité implicite du contrat retenu
    impliedVolatility: z.number().gt(0),
});

export const smileCurveSchema = z.object({
    // YYYY-MM-DD
    expiration: z.iso.date(),
    // Triés par strike croissant
    points: z.array(smilePointSchema),
});

export const optionChainResultSchema = z.object({
    symbol: z.string().min(1),
    // Jour de la chaîne, YYYY-MM-DD
    asOf: z.iso.date(),
    // Devise du sous-jacent
    spot: z.number().gt(0),
    // Ratio annuel continu : taux sans risque (maturité la plus courte de la courbe US), commun à toutes les échéances
    rate: z.number(),
    // Ratio annuel continu : rendement du dividende q
    dividendYield: z.number().min(0),
    // Contrats lus sur les échéances du smile
    contractsTotal: z.number().int().min(0),
    // Contrats retenus par le filtre
    contractsKept: z.number().int().min(0),
    // Contrats écartés, par cause : leur somme + contractsKept = contractsTotal
    discarded: z.object({
        noBidAsk: z.number().int().min(0),
        noPrice: z.number().int().min(0),
        ivOutOfBounds: z.number().int().min(0),
    }),
    // Ratio annuel : volatilité implicite du contrat retenu le plus proche du spot, première échéance ; null sans contrat retenu
    atmVolatility: z.number().gt(0).nullable(),
    // Ratio annuel : écart-type des rendements logarithmiques des 30 derniers jours de bourse × √252 ; null sous 20 rendements ou série plate
    historicalVolatility: z.number().gt(0).nullable(),
    // Ratio (0.032 = +3,2 points de volatilité) : atmVolatility − historicalVolatility ; positif si le marché anticipe plus que le passé, null si l'une des deux manque
    volatilityPremium: z.number().nullable(),
    // Une courbe par échéance, de la plus proche à la plus lointaine
    smile: z.array(smileCurveSchema),
    // Échéance détaillée dans `chain`, YYYY-MM-DD (la première du smile)
    chainExpiration: z.iso.date(),
    // Calls puis puts de l'échéance, triés par strike
    chain: z.array(chainRowSchema),
});

const bondPricingResultSchema = z.object({ kind: z.literal("BOND"), bond: bondResultSchema });
const optionPricingResultSchema = z.object({ kind: z.literal("OPTION"), option: optionResultSchema });

const optionChainPricingResultSchema = z.object({ kind: z.literal("OPTION_CHAIN"), chain: optionChainResultSchema });

export const pricingResultSchema = z.discriminatedUnion("kind", [bondPricingResultSchema, optionPricingResultSchema, optionChainPricingResultSchema]);

export const pricingCompletedPayloadSchema = z.object({
    requestId: z.string().min(1),
    finishedAt: z.iso.datetime(),
    result: pricingResultSchema,
});

export const pricingCompletedEventSchema = kafkaEventSchema(pricingCompletedPayloadSchema);

export const pricingFailedPayloadSchema = z.object({
    requestId: z.string().min(1),
    finishedAt: z.iso.datetime(),
    // Cause lisible : courbe indisponible, maturité hors courbe, erreur de calcul
    reason: z.string().min(1),
});

export const pricingFailedEventSchema = kafkaEventSchema(pricingFailedPayloadSchema);

export type RateCurvePoint = z.infer<typeof rateCurvePointSchema>;
export type RateCurve = z.infer<typeof rateCurveSchema>;
export type BondDiscount = z.infer<typeof bondDiscountSchema>;
export type BondInput = z.infer<typeof bondInputSchema>;
export type OptionInput = z.infer<typeof optionInputSchema>;
export type PricingInput = z.infer<typeof pricingInputSchema>;
export type PricingRequestedPayload = z.infer<typeof pricingRequestedPayloadSchema>;
export type BondFlow = z.infer<typeof bondFlowSchema>;
export type BondResult = z.infer<typeof bondResultSchema>;
export type OptionPrice = z.infer<typeof optionPriceSchema>;
export type PayoffPoint = z.infer<typeof payoffPointSchema>;
export type OptionGreeks = z.infer<typeof optionGreeksSchema>;
export type ChainRow = z.infer<typeof chainRowSchema>;
export type SmileCurve = z.infer<typeof smileCurveSchema>;
export type OptionChainResult = z.infer<typeof optionChainResultSchema>;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type OptionResult = z.infer<typeof optionResultSchema>;
export type PricingResult = z.infer<typeof pricingResultSchema>;
export type PricingCompletedPayload = z.infer<typeof pricingCompletedPayloadSchema>;
export type PricingFailedPayload = z.infer<typeof pricingFailedPayloadSchema>;
export type PricingKind = (typeof PRICING_KINDS)[number];
export type PricingStatus = (typeof PRICING_STATUSES)[number];

// Réponse de GET /api/pricing/:id et de POST /api/pricing
export interface PricingView {
    id: string;
    kind: PricingKind;
    status: PricingStatus;
    input: PricingInput;
    // Non null seulement si status = COMPLETED
    result: PricingResult | null;
    // Non null seulement si status = FAILED
    error: string | null;
    createdAt: string;
}
