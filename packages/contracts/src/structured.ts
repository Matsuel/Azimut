import { z } from "zod";

// Produits structurés pricés par le pipeline `pricing.*` (kind STRUCTURED, 21)
export const STRUCTURED_PRODUCTS = ["CAPITAL_GUARANTEED", "REVERSE_CONVERTIBLE", "AUTOCALLABLE"] as const;

// Bornes de la maturité, en années entières : l'autocallable observe une fois par an (D6)
export const STRUCTURED_MATURITY_BOUNDS = { min: 1, max: 10 } as const;

// Briques d'un produit : l'obligation et l'option dont le total fait la juste valeur
export const STRUCTURED_BRICK_TYPES = ["ZERO_COUPON", "CALL", "BOND", "PUT", "AUTOCALL_NET_COUPONS"] as const;

const commonInput = {
    // Libellé du sous-jacent (symbole market-service) : le produit est calculé en pourcentage du niveau initial, le cours n'entre pas dans le prix
    underlying: z.string().trim().min(1),
    // EUR (> 0) : nominal ; le prix client est le nominal à 100 % (D5), jamais saisi
    nominal: z.number().gt(0),
    // Années entières entre STRUCTURED_MATURITY_BOUNDS.min et .max
    maturityYears: z.number().int().min(STRUCTURED_MATURITY_BOUNDS.min).max(STRUCTURED_MATURITY_BOUNDS.max),
    // Ratio annuel composé (0.03 = 3 %) : taux d'actualisation du zéro-coupon et des coupons
    rate: z.number().min(0).max(1),
    // Ratio annuel (0.18 = 18 %) : volatilité du sous-jacent
    volatility: z.number().gt(0).max(5),
    // Date de départ, YYYY-MM-DD : ne date que les observations, jamais le prix
    valueDate: z.iso.date(),
};

export const capitalGuaranteedInputSchema = z.object({
    product: z.literal("CAPITAL_GUARANTEED"),
    ...commonInput,
    // Ratio du nominal (1 = 100 %) : capital rendu à l'échéance
    guarantee: z.number().gt(0).max(1),
    // Ratio du niveau initial (1 = à la monnaie) : strike du call de participation
    callStrike: z.number().gt(0).max(2),
});

export const reverseConvertibleInputSchema = z.object({
    product: z.literal("REVERSE_CONVERTIBLE"),
    ...commonInput,
    // Ratio annuel du nominal (0.04 = 4 %) : coupon versé chaque année
    couponRate: z.number().gt(0).max(1),
    // Ratio du niveau initial (1 = à la monnaie) : strike du put vendu
    putStrike: z.number().gt(0).max(2),
});

export const autocallableInputSchema = z.object({
    product: z.literal("AUTOCALLABLE"),
    ...commonInput,
    // Ratio annuel du nominal (0.06 = 6 %) : coupon cumulé à chaque année écoulée, versé au rappel ou à l'échéance
    couponRate: z.number().gt(0).max(1),
    // Ratio du niveau initial (1 = 100 %) : seuil de rappel observé chaque année
    recallLevel: z.number().gt(0).max(2),
    // Ratio du niveau initial (0.6 = 60 %) : barrière de protection du capital, observée à l'échéance
    protectionBarrier: z.number().gt(0).max(1),
});

export const structuredInputSchema = z.discriminatedUnion("product", [
    capitalGuaranteedInputSchema,
    reverseConvertibleInputSchema,
    autocallableInputSchema,
]);

// Brique du produit
export const structuredBrickSchema = z.object({
    type: z.enum(STRUCTURED_BRICK_TYPES),
    // EUR : valeur de la brique, négative pour une vente (put vendu)
    value: z.number(),
    // Ratio du nominal : value / nominal
    ratio: z.number(),
});

// Point du payoff à l'échéance, pour le nominal
export const structuredPayoffPointSchema = z.object({
    // Ratio (−0.5 = −50 %) : variation du sous-jacent entre le départ et l'échéance
    underlyingChange: z.number(),
    // EUR : montant total reçu à l'échéance (capital et coupons)
    payoff: z.number(),
});

// Observation annuelle de l'autocallable, avant l'échéance
export const autocallObservationSchema = z.object({
    year: z.number().int().min(1),
    // YYYY-MM-DD : valueDate + `year` ans
    date: z.iso.date(),
    // Ratio du niveau initial : seuil de rappel
    recallLevel: z.number(),
    // Ratio du nominal : coupon cumulé versé en cas de rappel à cette date
    cumulativeCoupon: z.number(),
    // Ratio : part des trajectoires rappelées à cette date, pas avant
    recallProbability: z.number().min(0).max(1),
});

const commonResult = {
    // EUR : somme des briques (rendue telle quelle, jamais recalculée côté web)
    fairValue: z.number(),
    // Ratio du nominal
    fairValueRatio: z.number(),
    // EUR : nominal à 100 % (D5)
    clientPrice: z.number(),
    // EUR : prix client − juste valeur (D4) ; négatif si le coupon dépasse ce que la juste valeur finance
    margin: z.number(),
    // Ratio du prix client
    marginRatio: z.number(),
    bricks: z.array(structuredBrickSchema).min(1),
    // De −50 % à +60 % du sous-jacent, par pas de 5 points
    payoff: z.array(structuredPayoffPointSchema).min(2),
};

export const capitalGuaranteedResultSchema = z.object({
    product: z.literal("CAPITAL_GUARANTEED"),
    ...commonResult,
    // EUR : nominal − zéro-coupon − marge, consacré à l'achat du call (D2)
    optionBudget: z.number(),
    // EUR : prix d'un call sur le nominal au strike demandé (Black-Scholes)
    callPrice: z.number(),
    // Ratio : budget / prix du call, part de la hausse reçue
    participation: z.number(),
});

export const reverseConvertibleResultSchema = z.object({
    product: z.literal("REVERSE_CONVERTIBLE"),
    ...commonResult,
    // EUR : prix du put vendu sur le nominal (Black-Scholes), prime encaissée par l'investisseur
    putPrice: z.number(),
});

export const autocallableResultSchema = z.object({
    product: z.literal("AUTOCALLABLE"),
    ...commonResult,
    // EUR : erreur standard du prix simulé
    standardError: z.number().min(0),
    paths: z.number().int().gt(0),
    seed: z.number().int(),
    // Une ligne par année avant l'échéance
    observations: z.array(autocallObservationSchema),
    // Ratio : part des trajectoires qui arrivent à l'échéance sans rappel
    maturityProbability: z.number().min(0).max(1),
    // Ratio : part des trajectoires rappelées avant l'échéance (1 − maturityProbability)
    recallProbability: z.number().min(0).max(1),
    // YYYY-MM-DD : valueDate + maturityYears ans, date de la dernière observation
    maturityDate: z.iso.date(),
    // Ratio du nominal : coupon cumulé à l'échéance
    maturityCumulativeCoupon: z.number(),
});

export const structuredResultSchema = z.discriminatedUnion("product", [
    capitalGuaranteedResultSchema,
    reverseConvertibleResultSchema,
    autocallableResultSchema,
]);

export type StructuredProduct = (typeof STRUCTURED_PRODUCTS)[number];
export type StructuredBrickType = (typeof STRUCTURED_BRICK_TYPES)[number];
export type StructuredInput = z.infer<typeof structuredInputSchema>;
export type CapitalGuaranteedInput = z.infer<typeof capitalGuaranteedInputSchema>;
export type ReverseConvertibleInput = z.infer<typeof reverseConvertibleInputSchema>;
export type AutocallableInput = z.infer<typeof autocallableInputSchema>;
export type StructuredBrick = z.infer<typeof structuredBrickSchema>;
export type StructuredPayoffPoint = z.infer<typeof structuredPayoffPointSchema>;
export type AutocallObservation = z.infer<typeof autocallObservationSchema>;
export type StructuredResult = z.infer<typeof structuredResultSchema>;
export type CapitalGuaranteedResult = z.infer<typeof capitalGuaranteedResultSchema>;
export type ReverseConvertibleResult = z.infer<typeof reverseConvertibleResultSchema>;
export type AutocallableResult = z.infer<typeof autocallableResultSchema>;
