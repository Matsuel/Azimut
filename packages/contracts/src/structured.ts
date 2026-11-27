import { z } from "zod";

// Produits structurés pricés par le pipeline `pricing.*` (kind STRUCTURED, 21)
export const STRUCTURED_PRODUCTS = ["CAPITAL_GUARANTEED", "REVERSE_CONVERTIBLE", "AUTOCALLABLE"] as const;

// Bornes de la maturité, en années entières : l'autocallable observe une fois par an (D6)
export const STRUCTURED_MATURITY_BOUNDS = { min: 1, max: 10 } as const;

// Panier (D13) : 2 à 5 sous-jacents, le payoff, la barrière et le rappel suivent l'agrégat choisi
export const STRUCTURED_BASKET_SIZE = { min: 2, max: 5 } as const;
export const STRUCTURED_BASKET_MODES = ["WORST_OF", "BEST_OF", "AVERAGE"] as const;

// Fréquence d'observation de l'autocallable (D18) ; les observations par an sont 1, 2 et 4
export const STRUCTURED_OBSERVATION_FREQUENCIES = ["ANNUAL", "SEMI_ANNUAL", "QUARTERLY"] as const;

// Observations par an pour chaque fréquence
export const STRUCTURED_OBSERVATIONS_PER_YEAR = { ANNUAL: 1, SEMI_ANNUAL: 2, QUARTERLY: 4 } as const;

// Briques d'un produit : l'obligation et l'option dont le total fait la juste valeur
export const STRUCTURED_BRICK_TYPES = ["ZERO_COUPON", "CALL", "BOND", "PUT", "AUTOCALL_NET_COUPONS"] as const;

// Sous-jacent d'un panier : ses valeurs de marché, saisies ou préremplies depuis market-service (D13)
export const basketUnderlyingSchema = z.object({
    symbol: z.string().trim().min(1),
    // Devise du sous-jacent (> 0) : cours initial
    spot: z.number().gt(0),
    // Ratio annuel (0.18 = 18 %)
    volatility: z.number().gt(0).max(5),
    // Ratio annuel continu (0.03 = 3 %)
    dividendYield: z.number().min(0).max(1),
});

export const basketSchema = z.object({
    mode: z.enum(STRUCTURED_BASKET_MODES),
    underlyings: z.array(basketUnderlyingSchema).min(STRUCTURED_BASKET_SIZE.min).max(STRUCTURED_BASKET_SIZE.max),
    // Corrélations des rendements entre sous-jacents, dans l'ordre de `underlyings` : matrice carrée symétrique de diagonale 1, de −1 à 1. Définie positive : l'engine le vérifie (Cholesky). Contrôle de forme dans `structuredInputSchema`
    correlations: z.array(z.array(z.number().min(-1).max(1))),
});

const commonInput = {
    // Symbole du sous-jacent (market-service) : le produit est calculé en pourcentage du niveau initial, le cours n'entre pas dans le prix ; ce sont la volatilité, le dividende et le taux, lus sur le marché par le web, qui le déterminent
    underlying: z.string().trim().min(1),
    // EUR (> 0) : nominal ; le prix client est le nominal à 100 % (D5), jamais saisi
    nominal: z.number().gt(0),
    // Années entières entre STRUCTURED_MATURITY_BOUNDS.min et .max
    maturityYears: z.number().int().min(STRUCTURED_MATURITY_BOUNDS.min).max(STRUCTURED_MATURITY_BOUNDS.max),
    // Ratio annuel composé (0.03 = 3 %) : taux d'actualisation du zéro-coupon et des coupons
    rate: z.number().min(0).max(1),
    // Ratio annuel (0.18 = 18 %) : volatilité du sous-jacent
    volatility: z.number().gt(0).max(5),
    // Ratio annuel continu (0.03 = 3 %) : rendement des dividendes du sous-jacent, que le produit ne perçoit pas : il abaisse le forward, donc le prix du call et la participation
    dividendYield: z.number().min(0).max(1),
    // Date de départ, YYYY-MM-DD : ne date que les observations, jamais le prix
    valueDate: z.iso.date(),
    // Devise du sous-jacent (> 0) : cours initial. Requis par les niveaux en prix (D14, D27) ; seul le panier en porte un par sous-jacent
    spot: z.number().gt(0).optional(),
    // Panier de 2 à 5 sous-jacents (D13) : volatilité, dividende et cours viennent alors du panier ; `underlying`, `volatility` et `dividendYield` ci-dessus ne servent plus qu'au libellé (D30)
    basket: basketSchema.optional(),
    // Ratio du nominal (0.04 = 4 %) : marge visée (D12). Présente, le prix client et la condition offerte (participation, coupon) sont calculés par l'engine ; absente, le comportement livré (D5, D10)
    targetMargin: z.number().min(0).max(0.5).optional(),
    // Points de base (150 = 1,5 %) : spread de financement de l'émetteur, le zéro-coupon est escompté à taux + spread (D17) ; 0 si absent
    fundingSpreadBps: z.number().min(0).max(1000).optional(),
    // Ratio du nominal : coût de couverture saisi, retranché de la marge pour la marge nette (D20) ; 0 si absent
    hedgingCost: z.number().min(0).max(1).optional(),
};

export const capitalGuaranteedInputSchema = z.object({
    product: z.literal("CAPITAL_GUARANTEED"),
    ...commonInput,
    // Ratio du nominal (1 = 100 %) : capital rendu à l'échéance
    guarantee: z.number().gt(0).max(1),
    // Ratio du niveau initial (1 = à la monnaie) : strike du call de participation
    callStrike: z.number().gt(0).max(2),
    // Devise du sous-jacent : strike en prix (D27), remplace `callStrike` ; exige `spot`, un seul sous-jacent
    callStrikePrice: z.number().gt(0).optional(),
});

export const reverseConvertibleInputSchema = z.object({
    product: z.literal("REVERSE_CONVERTIBLE"),
    ...commonInput,
    // Ratio annuel du nominal (0.04 = 4 %) : coupon versé chaque année
    couponRate: z.number().gt(0).max(1),
    // Ratio du niveau initial (1 = à la monnaie) : strike du put vendu
    putStrike: z.number().gt(0).max(2),
    // Devise du sous-jacent : strike en prix (D27), remplace `putStrike` ; exige `spot`, un seul sous-jacent
    putStrikePrice: z.number().gt(0).optional(),
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
    // Devise du sous-jacent : seuil de rappel en prix (D27), remplace `recallLevel` ; exige `spot`, un seul sous-jacent
    recallPrice: z.number().gt(0).optional(),
    // Devise du sous-jacent : barrière en prix (D27), remplace `protectionBarrier` ; exige `spot`, un seul sous-jacent
    protectionBarrierPrice: z.number().gt(0).optional(),
    // Fréquence d'observation du rappel (D18) ; ANNUAL si absente, comme le produit livré
    observationFrequency: z.enum(STRUCTURED_OBSERVATION_FREQUENCIES).optional(),
    // true si absent (D28) : le coupon cumulé de toutes les périodes écoulées est versé au rappel ; false : seulement celui de la période du rappel
    memoryCoupon: z.boolean().optional(),
    // Nombre d'observations (≥ 0) sans rappel possible depuis le départ (D18) ; 0 si absent
    nonCallObservations: z.number().int().min(0).max(39).optional(),
});

/**
 * Contrôles entre champs, sur l'union plutôt que sur chaque produit (les schémas de produit restent des objets simples) : niveaux en
 * prix (D27), forme de la matrice de corrélations (D13), période de non-rappel. La définie-positivité de la matrice reste à l'engine.
 */
export const structuredInputSchema = z
    .discriminatedUnion("product", [capitalGuaranteedInputSchema, reverseConvertibleInputSchema, autocallableInputSchema])
    .superRefine((input, ctx) => {
        const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

        const prices = [input.product === "CAPITAL_GUARANTEED" && input.callStrikePrice, input.product === "REVERSE_CONVERTIBLE" && input.putStrikePrice];
        if (input.product === "AUTOCALLABLE") prices.push(input.recallPrice, input.protectionBarrierPrice);
        if (prices.some((price) => typeof price === "number")) {
            if (input.basket) issue("basket", "Price levels apply to a single underlying (D27)");
            if (input.spot === undefined) issue("spot", "Price levels need the spot");
        }

        const { basket } = input;
        if (basket) {
            const size = basket.underlyings.length;
            const square = basket.correlations.length === size && basket.correlations.every((row) => row.length === size);
            const unit = square && basket.correlations.every((row, i) => row[i] === 1);
            const symmetric = square && basket.correlations.every((row, i) => row.every((value, j) => value === basket.correlations[j]![i]));
            if (!square || !unit || !symmetric) issue("basket", "Correlations must be a square symmetric matrix with a unit diagonal");
        }

        if (input.product === "AUTOCALLABLE" && input.nonCallObservations !== undefined) {
            const perYear = STRUCTURED_OBSERVATIONS_PER_YEAR[input.observationFrequency ?? "ANNUAL"];
            if (input.nonCallObservations >= input.maturityYears * perYear) issue("nonCallObservations", "Non-call period must leave at least one observation");
        }
    });

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

// Observation de l'autocallable, avant l'échéance
export const autocallObservationSchema = z.object({
    // Année entière de l'observation, arrondie au-dessus avec une fréquence infra-annuelle (D18)
    year: z.number().int().min(1),
    // Rang de l'observation depuis le départ (1 = première) ; absent d'un résultat antérieur à D18, où il vaut `year`
    index: z.number().int().min(1).optional(),
    // YYYY-MM-DD : valueDate + (rang / observations par an) ans
    date: z.iso.date(),
    // Ratio du niveau initial : seuil de rappel
    recallLevel: z.number(),
    // Ratio du nominal : coupon cumulé versé en cas de rappel à cette date
    cumulativeCoupon: z.number(),
    // Ratio : part des trajectoires rappelées à cette date, pas avant
    recallProbability: z.number().min(0).max(1),
});

// Sensibilité par sous-jacent du panier (D20), de l'engine par bump and reprice à tirages identiques
export const structuredSensitivitySchema = z.object({
    symbol: z.string(),
    // EUR : variation de la juste valeur du produit pour une hausse de 1 % du sous-jacent (delta en devise)
    delta: z.number(),
    // EUR : variation de la juste valeur pour +1 point de volatilité (0,01) de ce sous-jacent
    vega: z.number(),
});

export const structuredRiskSchema = z.object({
    underlyings: z.array(structuredSensitivitySchema).min(1),
    // EUR : variation de la juste valeur pour +10 points de corrélation entre tous les sous-jacents ; null pour un sous-jacent unique
    correlationSensitivity: z.number().nullable(),
    // EUR : coût de couverture saisi (`hedgingCost` × nominal)
    hedgingCost: z.number(),
    // EUR : marge − coût de couverture
    netMargin: z.number(),
    // Ratio du prix client
    netMarginRatio: z.number(),
});

const commonResult = {
    // EUR : somme des briques (rendue telle quelle, jamais recalculée côté web)
    fairValue: z.number(),
    // Ratio du nominal
    fairValueRatio: z.number(),
    // EUR : nominal à 100 % (D5) ; avec une marge cible, prix déduit par l'engine (D12)
    clientPrice: z.number(),
    // EUR : prix client − juste valeur (D4) ; négatif si le coupon dépasse ce que la juste valeur finance
    margin: z.number(),
    // Ratio du prix client
    marginRatio: z.number(),
    bricks: z.array(structuredBrickSchema).min(1),
    // De −50 % à +60 % du sous-jacent, par pas de 5 points
    payoff: z.array(structuredPayoffPointSchema).min(2),
    // Corrélations utilisées, dans l'ordre du panier (D13) ; absent d'un sous-jacent unique ou d'un résultat antérieur
    correlations: z.array(z.array(z.number())).optional(),
    // Risque du produit (D20) ; absent d'un résultat antérieur : l'écran affiche un tiret
    risk: structuredRiskSchema.optional(),
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
    // Ratio annuel du nominal : coupon effectif, celui saisi ou celui qui donne la marge cible (D12)
    couponRate: z.number().optional(),
});

export const autocallableResultSchema = z.object({
    product: z.literal("AUTOCALLABLE"),
    ...commonResult,
    // Ratio annuel du nominal : coupon effectif, celui saisi ou celui qui donne la marge cible (D12)
    couponRate: z.number().optional(),
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
export type StructuredBasketMode = (typeof STRUCTURED_BASKET_MODES)[number];
export type StructuredObservationFrequency = (typeof STRUCTURED_OBSERVATION_FREQUENCIES)[number];
export type StructuredBasket = z.infer<typeof basketSchema>;
export type StructuredBasketUnderlying = z.infer<typeof basketUnderlyingSchema>;
export type StructuredRisk = z.infer<typeof structuredRiskSchema>;
export type StructuredSensitivity = z.infer<typeof structuredSensitivitySchema>;
export type StructuredBrick = z.infer<typeof structuredBrickSchema>;
export type StructuredPayoffPoint = z.infer<typeof structuredPayoffPointSchema>;
export type AutocallObservation = z.infer<typeof autocallObservationSchema>;
export type StructuredResult = z.infer<typeof structuredResultSchema>;
export type CapitalGuaranteedResult = z.infer<typeof capitalGuaranteedResultSchema>;
export type ReverseConvertibleResult = z.infer<typeof reverseConvertibleResultSchema>;
export type AutocallableResult = z.infer<typeof autocallableResultSchema>;
