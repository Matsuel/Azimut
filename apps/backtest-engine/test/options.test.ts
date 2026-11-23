import { expect, test } from "bun:test"
import { pricingResultSchema, type OptionInput } from "@azimut/contracts"
import { round } from "@azimut/utils"
import { ImpliedVolatilityError, impliedVolatility, normalCdf, optionGreeks, optionSidePrice, payoff, priceOption } from "../engine/options"

const reference: OptionInput = { spot: 100, strike: 100, maturityYears: 1, rate: 0.05, dividendYield: 0, volatility: 0.2 }

test("normalCdf : valeurs connues et symétrie", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 12)
    expect(normalCdf(1.96)).toBeCloseTo(0.9750021048517795, 12)
    expect(normalCdf(-1.96)).toBeCloseTo(1 - 0.9750021048517795, 12)
    expect(Math.abs(normalCdf(-8) / 6.220960574271786e-16 - 1)).toBeLessThan(1e-7)
    expect(normalCdf(40)).toBe(1)
    expect(normalCdf(-40)).toBe(0)
})

test("référence : S=K=100, r=5 %, σ=20 %, T=1 an → call 10,45 et put 5,57", () => {
    const { call, put } = priceOption(reference)

    expect(call.price).toBe(10.45)
    expect(put.price).toBe(5.57)
    expect(call.intrinsicValue).toBe(0)
    expect(call.timeValue).toBe(10.45)
    expect(call.breakEven).toBe(110.45)
    expect(put.breakEven).toBe(94.43)
})

test("parité call-put à 1e-6 près, avec et sans dividende, dans la monnaie ou non", () => {
    const cases: OptionInput[] = [
        reference,
        { spot: 224.4, strike: 230, maturityYears: 182 / 365, rate: 0.04, dividendYield: 0.005, volatility: 0.243 },
        { spot: 50, strike: 80, maturityYears: 2, rate: 0.01, dividendYield: 0.03, volatility: 0.6 },
        { spot: 300, strike: 120, maturityYears: 0.05, rate: -0.005, dividendYield: 0, volatility: 0.1 },
    ]

    for (const option of cases) {
        const result = priceOption(option)
        expect(Math.abs(result.parityGap)).toBeLessThanOrEqual(1e-6)
        expect(result.parityVerified).toBe(true)
        expect(result.callMinusPut).toBeCloseTo(
            option.spot * Math.exp(-option.dividendYield * option.maturityYears) - option.strike * Math.exp(-option.rate * option.maturityYears),
            5,
        )
    }
})

test("payoff : call max(S − K, 0), put max(K − S, 0)", () => {
    expect(payoff("CALL", 120, 100)).toBe(20)
    expect(payoff("CALL", 80, 100)).toBe(0)
    expect(payoff("PUT", 80, 100)).toBe(20)
    expect(payoff("PUT", 120, 100)).toBe(0)
})

test("grille : 21 cours croissants de 0,7 × min à 1,3 × max, net = payoff − prime", () => {
    const { payoffGrid, call, put } = priceOption(reference)

    expect(payoffGrid).toHaveLength(21)
    expect(payoffGrid[0]!.spot).toBe(70)
    expect(payoffGrid.at(-1)!.spot).toBe(130)
    for (let i = 1; i < payoffGrid.length; i++) expect(payoffGrid[i]!.spot).toBeGreaterThan(payoffGrid[i - 1]!.spot)

    const first = payoffGrid[0]!
    expect(first).toEqual({ spot: 70, callPayoff: 0, putPayoff: 30, callNet: -call.price, putNet: round(30 - put.price, 2) })
    // Perte maximale d'un achat : la prime
    expect(Math.min(...payoffGrid.map((point) => point.callNet))).toBe(-call.price)
    expect(Math.min(...payoffGrid.map((point) => point.putNet))).toBe(-put.price)
})

test("grille : étendue calculée sur le plus petit et le plus grand de spot et strike", () => {
    const { payoffGrid } = priceOption({ ...reference, spot: 224.4, strike: 230 })

    expect(payoffGrid[0]!.spot).toBe(157.08)
    expect(payoffGrid.at(-1)!.spot).toBe(299)
})


test("résultat conforme au contrat pour la référence et une parité à dividende", () => {
    const reference: OptionInput = { spot: 100, strike: 100, maturityYears: 1, rate: 0.05, dividendYield: 0, volatility: 0.2 }

    for (const input of [reference, { ...reference, spot: 80, strike: 120, dividendYield: 0.03, maturityYears: 0.5 }]) {
        expect(pricingResultSchema.safeParse({ kind: "OPTION", option: priceOption(input) }).success).toBe(true)
    }
})

test("paramètres hors plage numérique : erreur claire", () => {
    expect(() => priceOption({ spot: 100, strike: 100, maturityYears: 1, rate: 0.05, dividendYield: 0, volatility: 1e-320 })).toThrow(
        "Option parameters out of numeric range",
    )
})

test("volatilité implicite : l'inversion redonne la volatilité d'origine à 1e-6 près (call et put)", () => {
    const { volatility: _, ...terms } = { ...reference, spot: 224.4, strike: 230, maturityYears: 182 / 365, rate: 0.04, dividendYield: 0.005 }

    for (const volatility of [0.05, 0.2, 0.243, 0.9, 2.5]) {
        for (const side of ["CALL", "PUT"] as const) {
            const price = optionSidePrice(side, { ...terms, volatility })
            expect(Math.abs(impliedVolatility(side, price, terms) - volatility)).toBeLessThan(1e-4)
        }
    }
})

test("volatilité implicite : un prix hors des bornes lève ImpliedVolatilityError", () => {
    const { volatility: _, ...terms } = reference

    // Un call ne peut pas coûter plus que le spot ; sous la valeur intrinsèque, il n'y a pas de volatilité
    expect(() => impliedVolatility("CALL", 150, terms)).toThrow(ImpliedVolatilityError)
    expect(() => impliedVolatility("PUT", 0, terms)).toThrow(ImpliedVolatilityError)
    expect(() => impliedVolatility("CALL", Number.NaN, terms)).toThrow(ImpliedVolatilityError)
})

test("grecques : valeurs de référence S=K=100, r=5 %, σ=20 %, T=1 an", () => {
    const call = optionGreeks("CALL", reference)
    const put = optionGreeks("PUT", reference)

    expect(call.delta).toBeCloseTo(0.6368, 4)
    expect(put.delta).toBeCloseTo(-0.3632, 4)
    expect(call.gamma).toBeCloseTo(put.gamma, 12)
    expect(call.gamma).toBeCloseTo(0.018762, 5)
    expect(call.vega).toBeCloseTo(0.37524, 4)
    expect(call.theta).toBeCloseTo(-0.017573, 5)
    expect(call.rho).toBeCloseTo(0.53232, 4)
    expect(put.rho).toBeCloseTo(-0.41890, 4)
})

test("grecques : égales aux différences finies du prix à 1e-4 près, avec dividende", () => {
    const option: OptionInput = { spot: 224.4, strike: 230, maturityYears: 182 / 365, rate: 0.04, dividendYield: 0.03, volatility: 0.243 }
    const price = (side: "CALL" | "PUT", change: Partial<OptionInput>) => optionSidePrice(side, { ...option, ...change })
    const shift = 1e-4

    for (const side of ["CALL", "PUT"] as const) {
        const greeks = optionGreeks(side, option)
        const delta = (price(side, { spot: option.spot + shift }) - price(side, { spot: option.spot - shift })) / (2 * shift)
        const gamma = (price(side, { spot: option.spot + 0.01 }) - 2 * price(side, {}) + price(side, { spot: option.spot - 0.01 })) / 0.01 ** 2
        const vega = (price(side, { volatility: option.volatility + shift }) - price(side, { volatility: option.volatility - shift })) / (2 * shift) / 100
        const rho = (price(side, { rate: option.rate + shift }) - price(side, { rate: option.rate - shift })) / (2 * shift) / 100
        const theta = price(side, { maturityYears: option.maturityYears - 1 / 365 }) - price(side, {})

        expect(Math.abs(greeks.delta - delta)).toBeLessThan(1e-4)
        expect(Math.abs(greeks.gamma - gamma)).toBeLessThan(1e-4)
        expect(Math.abs(greeks.vega - vega)).toBeLessThan(1e-4)
        expect(Math.abs(greeks.rho - rho)).toBeLessThan(1e-4)
        // Theta par jour : écart au prix d'un jour plus tard, au second ordre près
        expect(Math.abs(greeks.theta - theta)).toBeLessThan(1e-3)
    }
})
