import { z } from "zod";
import { kafkaEventSchema } from "./event";

export const PRICING_TOPICS = {
    requested: "pricing.requested",
    completed: "pricing.completed",
    failed: "pricing.failed",
} as const;

// Produits pricés par le pipeline `pricing.*` ; les options (18) et le Monte Carlo (20) s'ajoutent ici
export const PRICING_KINDS = ["BOND"] as const;

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

// Demande saisie par l'utilisateur (POST /api/pricing)
export const pricingInputSchema = z.object({
    kind: z.literal("BOND"),
    bond: bondInputSchema,
});

export const pricingRequestedPayloadSchema = z.object({
    requestId: z.string().min(1),
    ...pricingInputSchema.shape,
});

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
    // Années : duration de Macaulay, moyenne des échéances pondérée par leur valeur actuelle
    macaulayDuration: z.number(),
    // Années : durée de Macaulay / (1 + taux)
    modifiedDuration: z.number(),
    // Ratio (−0.0485 = −4,85 %) : variation du prix pour +1 point de taux, approximation du premier ordre (−durée modifiée × 0,01)
    priceChangeOnRatePlusOnePoint: z.number(),
    flows: z.array(bondFlowSchema).min(1),
});

export const pricingResultSchema = z.object({
    kind: z.literal("BOND"),
    bond: bondResultSchema,
});

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
export type PricingInput = z.infer<typeof pricingInputSchema>;
export type PricingRequestedPayload = z.infer<typeof pricingRequestedPayloadSchema>;
export type BondFlow = z.infer<typeof bondFlowSchema>;
export type BondResult = z.infer<typeof bondResultSchema>;
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
