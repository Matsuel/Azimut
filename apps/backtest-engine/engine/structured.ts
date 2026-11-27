import type {
    CapitalGuaranteedInput,
    CapitalGuaranteedResult,
    ReverseConvertibleInput,
    ReverseConvertibleResult,
    StructuredBrick,
    StructuredBrickType,
    StructuredInput,
    StructuredPayoffPoint,
} from "@azimut/contracts";
import { round } from "@azimut/utils";
import { AUTOCALL_PATHS, MONTE_CARLO_SEED, STRUCTURED_PAYOFF_GRID, STRUCTURING_MARGIN } from "../constants/pricing.constants";
import { basketOptions, resolveUnderlyings } from "./basket";
import { blackScholes } from "./options";

/** Taux continu équivalent au taux annuel composé du contrat : Black-Scholes actualise en continu, les coupons et le zéro-coupon en composé. */
export const continuousRate = (annualRate: number): number => Math.log(1 + annualRate);

/** Taux d'escompte du zéro-coupon et des coupons : taux + spread de financement de l'émetteur (D17), 0 par défaut. Le sous-jacent dérive au taux sans risque, lui. */
export const fundingRate = ({ rate, fundingSpreadBps }: Pick<StructuredInput, "rate" | "fundingSpreadBps">): number => rate + (fundingSpreadBps ?? 0) / 10_000;

/** Niveau en ratio du niveau initial : le prix saisi rapporté au cours (D14, D27) s'il y en a un, sinon le ratio. Le contrat garantit `spot` avec un prix. */
export const levelOf = (ratio: number, price: number | undefined, spot: number | undefined): number => (price === undefined ? ratio : price / spot!);

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
 * Call et put de strike `strike` (ratio du niveau initial) sur le nominal. Un sous-jacent unique garde la formule fermée de
 * Black-Scholes ; un panier passe en Monte Carlo sur l'agrégat (D13, graine fixe). Lève si le prix sort de la plage numérique.
 */
function vanillaOptions(input: StructuredInput, strike: number, seed: number): { call: number; put: number } {
    const { nominal, maturityYears, rate, dividendYield, volatility } = input;
    if (!input.basket) {
        const { call, put } = blackScholes({ spot: nominal, strike: strike * nominal, maturityYears, rate: continuousRate(rate), dividendYield, volatility });
        return { call, put };
    }
    const { call, put } = basketOptions(resolveUnderlyings(input), { rate: continuousRate(rate), years: maturityYears, strike, seed, paths: AUTOCALL_PATHS });
    return { call: call * nominal, put: put * nominal };
}

/** Matrice de corrélations du panier, publiée avec le résultat ; absente d'un sous-jacent unique. */
export const basketCorrelations = ({ basket }: StructuredInput) => (basket ? { correlations: basket.correlations } : {});

/**
 * Capital garanti (D1, D2) : zéro-coupon + call. Le zéro-coupon, escompté à taux + spread (D17), rend la garantie à l'échéance ; le
 * budget d'option est le nominal moins ce zéro-coupon moins la marge (cible saisie, sinon `STRUCTURING_MARGIN`, D12) ; la participation
 * est ce budget divisé par le prix du call, au strike demandé (en prix ou en ratio, D27) ; sur un panier, le call porte sur l'agrégat (D13).
 * Lève si le budget est nul ou négatif (marge inatteignable : garantie élevée avec un taux bas) ou si le prix sort de la plage numérique.
 */
export function priceCapitalGuaranteed(input: CapitalGuaranteedInput, seed = MONTE_CARLO_SEED): CapitalGuaranteedResult {
    const { nominal, maturityYears, guarantee } = input;
    const callStrike = levelOf(input.callStrike, input.callStrikePrice, input.spot);
    const zeroCoupon = guarantee * nominal * discountFactor(fundingRate(input), maturityYears);
    const optionBudget = nominal - zeroCoupon - (input.targetMargin ?? STRUCTURING_MARGIN) * nominal;
    if (optionBudget <= 0) throw new Error("Option budget is not positive: lower the guarantee or the margin, or raise the rate");

    const callPrice = vanillaOptions(input, callStrike, seed).call;
    if (!(callPrice > 0)) throw new Error("Call price is not positive: parameters out of numeric range");
    const participation = optionBudget / callPrice;

    return {
        product: "CAPITAL_GUARANTEED",
        ...assemble(nominal, [brick("ZERO_COUPON", zeroCoupon, nominal), brick("CALL", optionBudget, nominal)]),
        optionBudget: round(optionBudget, 2),
        callPrice: round(callPrice, 2),
        participation: round(participation, 4),
        payoff: payoffGrid((level) => nominal * (guarantee + participation * Math.max(level - callStrike, 0))),
        ...basketCorrelations(input),
    };
}

/**
 * Reverse convertible (D1) : obligation à coupon annuel moins un put vendu, escomptée à taux + spread (D17). Sans marge cible, le coupon
 * est saisi et la marge est ce qui reste du prix client après la juste valeur (un coupon trop généreux la rend négative). Avec une marge
 * cible (D12), le coupon est celui qui la donne : la juste valeur est linéaire en lui, donc résolu exactement. Lève si ce coupon serait
 * négatif (marge inatteignable). Sur un panier, le put porte sur l'agrégat (D13).
 */
export function priceReverseConvertible(input: ReverseConvertibleInput, seed = MONTE_CARLO_SEED): ReverseConvertibleResult {
    const { nominal, maturityYears } = input;
    const putStrike = levelOf(input.putStrike, input.putStrikePrice, input.spot);
    const funding = fundingRate(input);
    const zeroCoupon = nominal * discountFactor(funding, maturityYears);
    let annuity = 0;
    for (let year = 1; year <= maturityYears; year++) annuity += discountFactor(funding, year);

    const putPrice = vanillaOptions(input, putStrike, seed).put;
    if (!Number.isFinite(putPrice)) throw new Error("Put price out of numeric range");

    const couponRate = input.targetMargin === undefined ? input.couponRate : (nominal * (1 - input.targetMargin) + putPrice - zeroCoupon) / (nominal * annuity);
    if (!(couponRate > 0)) throw new Error("Target margin unreachable: the coupon would not be positive");
    const bond = zeroCoupon + nominal * couponRate * annuity;

    return {
        product: "REVERSE_CONVERTIBLE",
        ...assemble(nominal, [brick("BOND", bond, nominal), brick("PUT", -putPrice, nominal)]),
        putPrice: round(putPrice, 2),
        couponRate: round(couponRate, 6),
        payoff: payoffGrid((level) => nominal * (1 + couponRate * maturityYears - Math.max(putStrike - level, 0))),
        ...basketCorrelations(input),
    };
}
