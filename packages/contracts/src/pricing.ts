import { z } from "zod";
import { kafkaEventSchema } from "./event";

export const PRICING_TOPICS = {
    requested: "pricing.requested",
    completed: "pricing.completed",
    failed: "pricing.failed",
} as const;

// Produits pricés par le pipeline `pricing.*` ; le Monte Carlo (20) s'ajoute ici
export const PRICING_KINDS = ["BOND", "OPTION"] as const;

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

const bondPricingInputSchema = z.object({ kind: z.literal("BOND"), bond: bondInputSchema });
const optionPricingInputSchema = z.object({ kind: z.literal("OPTION"), option: optionInputSchema });

// Demande saisie par l'utilisateur (POST /api/pricing) : un produit à la fois, discriminé par `kind`
export const pricingInputSchema = z.discriminatedUnion("kind", [bondPricingInputSchema, optionPricingInputSchema]);

export const pricingRequestedPayloadSchema = z.discriminatedUnion("kind", [
    bondPricingInputSchema.extend({ requestId: z.string().min(1) }),
    optionPricingInputSchema.extend({ requestId: z.string().min(1) }),
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
    // Du plus petit au plus grand cours final, 21 points entre 0,7 × min(spot, strike) et 1,3 × max(spot, strike)
    payoffGrid: z.array(payoffPointSchema).min(2),
});

const bondPricingResultSchema = z.object({ kind: z.literal("BOND"), bond: bondResultSchema });
const optionPricingResultSchema = z.object({ kind: z.literal("OPTION"), option: optionResultSchema });

export const pricingResultSchema = z.discriminatedUnion("kind", [bondPricingResultSchema, optionPricingResultSchema]);

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
