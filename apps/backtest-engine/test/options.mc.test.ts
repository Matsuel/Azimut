import { expect, test } from "bun:test"
import type { OptionMonteCarloInput } from "@azimut/contracts"
import { MONTE_CARLO_SEED } from "../constants/pricing.constants"
import { priceOptionMonteCarlo } from "../engine/options.mc"

// Cas de la maquette 38 : call 230 sur 224,40, 182 jours, barrière basse 200
const base: OptionMonteCarloInput = { spot: 224.4, strike: 230, maturityYears: 182 / 365, rate: 0.04, dividendYield: 0.005, volatility: 0.243, barrier: 200, paths: 100_000 }

test("même graine : même résultat ; graine différente : autre prix", () => {
    const small = { ...base, paths: 10_000 }
    expect(priceOptionMonteCarlo(small, MONTE_CARLO_SEED)).toEqual(priceOptionMonteCarlo(small, MONTE_CARLO_SEED))
    expect(priceOptionMonteCarlo(small, 7).vanilla.price).not.toBe(priceOptionMonteCarlo(small, MONTE_CARLO_SEED).vanilla.price)
})

test("vanille : écart à Black-Scholes sous 3 erreurs standard, validée", () => {
    const result = priceOptionMonteCarlo(base, MONTE_CARLO_SEED)

    expect(result.steps).toBe(182)
    expect(result.paths).toBe(100_000)
    expect(result.seed).toBe(MONTE_CARLO_SEED)
    expect(result.vanilla.standardError).toBeGreaterThan(0)
    expect(Math.abs(result.vanilla.price - result.blackScholesPrice)).toBeLessThan(3 * result.vanilla.standardError)
    expect(result.blackScholesGap).toBeLessThan(3)
    expect(result.validated).toBe(true)
})

test("knock-out + knock-in = vanille (mêmes trajectoires), barrière basse ou haute", () => {
    for (const barrier of [200, 260]) {
        const result = priceOptionMonteCarlo({ ...base, barrier, paths: 20_000 }, MONTE_CARLO_SEED)

        expect(result.barrierDirection).toBe(barrier < base.spot ? "DOWN" : "UP")
        expect(result.knockOut.price + result.knockIn.price).toBeCloseTo(result.vanilla.price, 3)
        expect(Math.abs(result.parityGap)).toBeLessThan(1e-6)
        expect(result.knockOut.price).toBeLessThanOrEqual(result.vanilla.price)
    }
})

test("barrière lointaine : jamais touchée, le knock-out vaut la vanille et le knock-in zéro", () => {
    const result = priceOptionMonteCarlo({ ...base, barrier: 1, paths: 10_000 }, MONTE_CARLO_SEED)

    expect(result.knockOut.price).toBe(result.vanilla.price)
    expect(result.knockIn.price).toBe(0)
    expect(result.sampleTouched).toBe(0)
})

test("convergence : 1 %, 5 %, 10 %, 50 % et 100 % des trajectoires, erreur standard décroissante en 1/√N", () => {
    const { convergence, vanilla } = priceOptionMonteCarlo(base, MONTE_CARLO_SEED)

    expect(convergence.map(({ paths }) => paths)).toEqual([1_000, 5_000, 10_000, 50_000, 100_000])
    expect(convergence.at(-1)).toEqual({ paths: 100_000, ...vanilla })
    for (let i = 1; i < convergence.length; i++) expect(convergence[i]!.standardError).toBeLessThan(convergence[i - 1]!.standardError)
    // 100 fois plus de trajectoires : environ 10 fois moins d'erreur
    expect(convergence[0]!.standardError / convergence.at(-1)!.standardError).toBeGreaterThan(8)
    expect(convergence[0]!.standardError / convergence.at(-1)!.standardError).toBeLessThan(12)
})

test("trajectoires d'illustration : 20, du spot au dernier jour, `touched` compté", () => {
    const { sample, sampleTouched, steps } = priceOptionMonteCarlo({ ...base, paths: 10_000 }, MONTE_CARLO_SEED)

    expect(sample).toHaveLength(20)
    for (const path of sample) {
        expect(path.prices).toHaveLength(steps + 1)
        expect(path.prices[0]).toBe(224.4)
        // Barrière basse : touchée si un cours de clôture est à ou sous 200
        expect(path.touched).toBe(path.prices.slice(1).some((price) => price <= 200))
    }
    expect(sampleTouched).toBe(sample.filter(({ touched }) => touched).length)
})

test("barrière égale au spot : erreur ; paramètres hors plage numérique : erreur", () => {
    expect(() => priceOptionMonteCarlo({ ...base, barrier: base.spot }, MONTE_CARLO_SEED)).toThrow("Barrier must differ")
    expect(() => priceOptionMonteCarlo({ ...base, volatility: Number.NaN }, MONTE_CARLO_SEED)).toThrow()
})
