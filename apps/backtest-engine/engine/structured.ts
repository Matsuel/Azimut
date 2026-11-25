import type {
    CapitalGuaranteedInput,
    CapitalGuaranteedResult,
    ReverseConvertibleInput,
    ReverseConvertibleResult,
    StructuredBrick,
    StructuredBrickType,
    StructuredPayoffPoint,
} from "@azimut/contracts";
import { round } from "@azimut/utils";
import { STRUCTURED_PAYOFF_GRID, STRUCTURING_MARGIN } from "../constants/pricing.constants";
import { blackScholes } from "./options";

/** Taux continu équivalent au taux annuel composé du contrat : Black-Scholes actualise en continu, les coupons et le zéro-coupon en composé. */
export const continuousRate = (annualRate: number): number => Math.log(1 + annualRate);

/** Facteur d'actualisation composé annuel : 1 / (1 + taux)^années. */
export const discountFactor = (annualRate: number, years: number): number => 1 / (1 + annualRate) ** years;

/**
 * Valeur d'une brique (EUR, 2 décimales) et part du nominal. L'arrondi se fait brique par brique, puis `assemble` additionne les
 * valeurs arrondies : le total affiché est la somme exacte des lignes affichées (US-01).
 */
export function brick(type: StructuredBrickType, value: number, nominal: number): StructuredBrick {
    return { type, value: round(value, 2), ratio: round(value / nominal, 4) };
}

/**
 * Totaux communs : juste valeur = somme des briques arrondies, prix client = nominal à 100 % (D5), marge = prix client − juste valeur
 * (D4, négative si le coupon dépasse ce que la juste valeur finance). Le web affiche ces valeurs sans les recalculer.
 */
export function assemble(nominal: number, bricks: StructuredBrick[]) {
    const fairValue = round(
        bricks.reduce((total, { value }) => total + value, 0),
        2,
    );
    const margin = round(nominal - fairValue, 2);
    return {
        fairValue,
        fairValueRatio: round(fairValue / nominal, 4),
        clientPrice: nominal,
        margin,
        marginRatio: round(margin / nominal, 4),
        bricks,
    };
}

/** Payoff à l'échéance sur la grille de variation du sous-jacent ; `payoffAt` reçoit le niveau final en ratio du niveau initial (1 = inchangé). */
export function payoffGrid(payoffAt: (level: number) => number): StructuredPayoffPoint[] {
    const { from, to, step } = STRUCTURED_PAYOFF_GRID;
    const count = Math.round((to - from) / step) + 1;
    return Array.from({ length: count }, (_, index) => {
        // Arrondi du pas : 0,05 n'est pas représentable, 0 % doit sortir exactement 0
        const underlyingChange = round(from + index * step, 4);
        return { underlyingChange, payoff: round(payoffAt(1 + underlyingChange), 2) };
    });
}

/**
 * Capital garanti (D1, D2) : zéro-coupon + call. Le zéro-coupon rend la garantie à l'échéance ; le budget d'option est le nominal
 * moins ce zéro-coupon moins la marge de structuration ; la participation est ce budget divisé par le prix du call, au strike demandé.
 * Lève si le budget est nul ou négatif (zéro-coupon trop cher : garantie élevée avec un taux bas) ou si Black-Scholes sort de sa plage.
 */
export function priceCapitalGuaranteed(input: CapitalGuaranteedInput): CapitalGuaranteedResult {
    const { nominal, maturityYears, rate, volatility, dividendYield, guarantee, callStrike } = input;
    const zeroCoupon = guarantee * nominal * discountFactor(rate, maturityYears);
    const optionBudget = nominal - zeroCoupon - STRUCTURING_MARGIN * nominal;
    if (optionBudget <= 0) throw new Error("Option budget is not positive: lower the guarantee or raise the rate");

    const callPrice = blackScholes({ spot: nominal, strike: callStrike * nominal, maturityYears, rate: continuousRate(rate), dividendYield, volatility }).call;
    if (!(callPrice > 0)) throw new Error("Call price is not positive: parameters out of numeric range");
    const participation = optionBudget / callPrice;

    return {
        product: "CAPITAL_GUARANTEED",
        ...assemble(nominal, [brick("ZERO_COUPON", zeroCoupon, nominal), brick("CALL", optionBudget, nominal)]),
        optionBudget: round(optionBudget, 2),
        callPrice: round(callPrice, 2),
        participation: round(participation, 4),
        payoff: payoffGrid((level) => nominal * (guarantee + participation * Math.max(level - callStrike, 0))),
    };
}

/**
 * Reverse convertible (D1) : obligation à coupon annuel moins un put vendu. Le coupon est saisi : la marge n'est pas imposée, elle
 * est ce qui reste du prix client après la juste valeur (le coupon d'un produit trop généreux la rend négative).
 */
export function priceReverseConvertible(input: ReverseConvertibleInput): ReverseConvertibleResult {
    const { nominal, maturityYears, rate, volatility, dividendYield, couponRate, putStrike } = input;
    let bond = nominal * discountFactor(rate, maturityYears);
    for (let year = 1; year <= maturityYears; year++) bond += nominal * couponRate * discountFactor(rate, year);

    const putPrice = blackScholes({ spot: nominal, strike: putStrike * nominal, maturityYears, rate: continuousRate(rate), dividendYield, volatility }).put;
    if (!Number.isFinite(putPrice)) throw new Error("Put price out of numeric range");

    return {
        product: "REVERSE_CONVERTIBLE",
        ...assemble(nominal, [brick("BOND", bond, nominal), brick("PUT", -putPrice, nominal)]),
        putPrice: round(putPrice, 2),
        payoff: payoffGrid((level) => nominal * (1 + couponRate * maturityYears - Math.max(putStrike - level, 0))),
    };
}
