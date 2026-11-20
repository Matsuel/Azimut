import { expect, test } from "bun:test"
import type { BondInput, RateCurvePoint } from "@azimut/contracts"
import { interpolateRate, priceBond } from "../engine/bonds"

const curve: RateCurvePoint[] = [
    { symbol: "^IRX", maturityYears: 0.25, rate: 0.04, date: "2026-10-28" },
    { symbol: "^FVX", maturityYears: 5, rate: 0.05, date: "2026-10-28" },
    { symbol: "^TNX", maturityYears: 10, rate: 0.06, date: "2026-10-27" },
]

const zeroCoupon: BondInput = { nominal: 100, couponRate: 0, maturityYears: 5, discount: { source: "FLAT", rate: 0.03 }, valueDate: "2026-10-28" }

test("zéro-coupon à 3 % sur 5 ans : 86,26 pour 100 (référence)", () => {
    const result = priceBond(zeroCoupon, null)

    expect(result.price).toBe(86.26)
    expect(result.macaulayDuration).toBe(5)
    expect(result.modifiedDuration).toBe(4.8544)
    expect(result.discountSource).toBe("FLAT")
    expect(result.curveDate).toBeNull()
})

test("les flux portent coupon, nominal à la dernière échéance, facteur et échéance datée", () => {
    const result = priceBond({ ...zeroCoupon, couponRate: 0.05, maturityYears: 2, discount: { source: "FLAT", rate: 0.05 } }, null)

    expect(result.flows).toEqual([
        { year: 1, date: "2027-10-28", cashFlow: 5, discountFactor: 0.952381, presentValue: 4.76 },
        { year: 2, date: "2028-10-28", cashFlow: 105, discountFactor: 0.907029, presentValue: 95.24 },
    ])
    // Obligation au pair : coupon = taux → prix = nominal
    expect(result.price).toBe(100)
})

test("duration de Macaulay d'une obligation à coupons : moyenne des échéances pondérée par la valeur actuelle", () => {
    const result = priceBond({ ...zeroCoupon, couponRate: 0.05, maturityYears: 2, discount: { source: "FLAT", rate: 0.05 } }, null)

    expect(result.macaulayDuration).toBe(1.9524)
})

test("une hausse de 1 point de taux change le prix d'environ −duration modifiée × 1 %", () => {
    const base = priceBond({ ...zeroCoupon, couponRate: 0.04, maturityYears: 10 }, null)
    const shocked = priceBond({ ...zeroCoupon, couponRate: 0.04, maturityYears: 10, discount: { source: "FLAT", rate: 0.04 } }, null)

    const exact = shocked.price / base.price - 1
    expect(base.priceChangeOnRatePlusOnePoint).toBeCloseTo(-base.modifiedDuration * 0.01, 6)
    expect(exact).toBeCloseTo(base.priceChangeOnRatePlusOnePoint, 2)
})

test("taux de courbe : interpolé à la maturité, date de courbe la plus récente", () => {
    const result = priceBond({ ...zeroCoupon, maturityYears: 7, discount: { source: "CURVE" } }, curve)

    // 7 ans = 40 % du chemin entre 5 ans (5 %) et 10 ans (6 %)
    expect(result.rate).toBe(0.054)
    expect(result.discountSource).toBe("CURVE")
    expect(result.curveDate).toBe("2026-10-28")
})

test("taux de courbe sans courbe : erreur", () => {
    expect(() => priceBond({ ...zeroCoupon, discount: { source: "CURVE" } }, null)).toThrow("Rate curve is required")
})

test("interpolation : point exact, milieu de segment, ordre des points indifférent", () => {
    expect(interpolateRate(curve, 5)).toBe(0.05)
    expect(interpolateRate([...curve].reverse(), 7.5)).toBeCloseTo(0.055, 10)
})

test("interpolation hors de la courbe : erreur explicite, pas d'extrapolation", () => {
    expect(() => interpolateRate(curve, 0.1)).toThrow("outside the rate curve")
    expect(() => interpolateRate(curve, 30)).toThrow("outside the rate curve")
    expect(() => interpolateRate([], 5)).toThrow("empty curve")
})
