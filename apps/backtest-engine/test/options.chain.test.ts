import { expect, test } from "bun:test"
import { optionChainResultSchema, type OptionQuote } from "@azimut/contracts"
import { analyseChain, type ChainInput } from "../engine/options.chain"
import { optionSidePrice } from "../engine/options"

const quote = (strike: number, bid: number, ask: number, yahooVolatility: number | null = null): OptionQuote => ({
    strike,
    bid,
    ask,
    lastPrice: ask,
    volume: 10,
    yahooVolatility,
})

const market = { spot: 100, rate: 0.04, dividendYield: 0.01 }
const asOf = "2026-10-28"
// 91 jours après asOf
const expiration = "2027-01-27"
const maturityYears = 91 / 365

// Cotation sans écart bid/ask au prix de Black-Scholes d'une volatilité donnée
const fair = (side: "CALL" | "PUT", strike: number, volatility: number) => {
    const price = optionSidePrice(side, { ...market, strike, maturityYears, volatility })
    return quote(strike, price - 0.005, price + 0.005)
}

const base: ChainInput = {
    symbol: "SPY",
    asOf,
    ...market,
    historicalVolatility: 0.152,
    expirations: [
        {
            expiration,
            calls: [fair("CALL", 100, 0.2), fair("CALL", 110, 0.18), quote(120, 0, 0, 0.125), quote(105, 0, 0.4), quote(90, 0.05, 0.4, 4.12)],
            puts: [fair("PUT", 90, 0.25), fair("PUT", 100, 0.2)],
        },
    ],
}

test("volatilité implicite recalculée sur le prix milieu, grecques déduites, valeur Yahoo seulement affichée", () => {
    const { chain } = analyseChain({ ...base, expirations: [{ expiration, calls: [{ ...fair("CALL", 100, 0.2), yahooVolatility: 0 }], puts: [] }] })
    const row = chain[0]!

    expect(row.status).toBe("KEPT")
    expect(row.impliedVolatility).toBeCloseTo(0.2, 3)
    expect(row.yahooVolatility).toBe(0)
    expect(row.greeks!.delta).toBeGreaterThan(0)
    expect(row.greeks!.delta).toBeLessThan(1)
})

test("filtre : bid et ask nuls, prix nul, IV hors bornes sont écartés et comptés par cause", () => {
    const result = analyseChain(base)
    const byStrike = (strike: number, side: "CALL" | "PUT") => result.chain.find((row) => row.strike === strike && row.side === side)!

    expect(byStrike(120, "CALL").status).toBe("NO_BID_ASK")
    expect(byStrike(105, "CALL").status).toBe("NO_PRICE")
    expect(byStrike(90, "CALL").status).toBe("IV_OUT_OF_BOUNDS")
    expect(byStrike(90, "CALL").mid).toBe(0.225)
    expect(byStrike(90, "CALL").impliedVolatility).toBeNull()
    expect(result).toMatchObject({
        contractsTotal: 7,
        contractsKept: 4,
        discarded: { noBidAsk: 1, noPrice: 1, ivOutOfBounds: 1 },
    })
})

test("smile : retenus hors de la monnaie seulement (put sous le spot, call au-dessus), triés par strike", () => {
    const [curve] = analyseChain(base).smile

    expect(curve!.expiration).toBe(expiration)
    expect(curve!.points.map((point) => point.strike)).toEqual([90, 100, 110])
    expect(curve!.points[0]!.impliedVolatility).toBeCloseTo(0.25, 3)
    expect(curve!.points[1]!.impliedVolatility).toBeCloseTo(0.2, 3)
    expect(curve!.points[2]!.impliedVolatility).toBeCloseTo(0.18, 3)
})

test("volatilité ATM : contrat retenu le plus proche du spot de la première échéance ; null sans contrat retenu", () => {
    expect(analyseChain(base).atmVolatility).toBeCloseTo(0.2, 3)
    expect(analyseChain({ ...base, expirations: [{ expiration, calls: [quote(100, 0, 0)], puts: [] }] }).atmVolatility).toBeNull()
})

test("plusieurs échéances : une courbe chacune, comptes cumulés, détail de la première", () => {
    const later = "2027-04-28"
    const result = analyseChain({ ...base, expirations: [...base.expirations, { expiration: later, calls: [quote(100, 0, 0)], puts: [] }] })

    expect(result.smile.map((curve) => curve.expiration)).toEqual([expiration, later])
    expect(result.chainExpiration).toBe(expiration)
    expect(result.contractsTotal).toBe(8)
    expect(result.discarded.noBidAsk).toBe(2)
})

test("résultat conforme au contrat", () => {
    expect(optionChainResultSchema.safeParse(analyseChain(base)).success).toBe(true)
})

test("échéance non postérieure au jour de la chaîne, ou aucune échéance : erreur", () => {
    expect(() => analyseChain({ ...base, expirations: [{ expiration: asOf, calls: [], puts: [] }] })).toThrow("not after")
    expect(() => analyseChain({ ...base, expirations: [] })).toThrow("without expiration")
})
