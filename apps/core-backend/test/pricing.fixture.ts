import type { OptionInput, PricingInput, PricingResult } from "@azimut/contracts"

export const pricingInput = {
    kind: "BOND",
    bond: { nominal: 100, couponRate: 0, maturityYears: 5, discount: { source: "FLAT", rate: 0.03 }, valueDate: "2026-10-28" },
} satisfies PricingInput

export const optionParams: OptionInput = { spot: 100, strike: 100, maturityYears: 1, rate: 0.05, dividendYield: 0, volatility: 0.2 }

export const optionInput: PricingInput = { kind: "OPTION", option: optionParams }

export const pricingResult: PricingResult = {
    kind: "BOND",
    bond: {
        rate: 0.03,
        discountSource: "FLAT",
        curveDate: null,
        price: 86.26,
        totalCashFlow: 100,
        macaulayDuration: 5,
        modifiedDuration: 4.8544,
        priceChangeOnRatePlusOnePoint: -0.048544,
        flows: [{ year: 5, date: "2031-10-28", cashFlow: 100, discountFactor: 0.862609, presentValue: 86.26 }],
    },
}

const optionSide = { price: 10.45, intrinsicValue: 0, timeValue: 10.45, breakEven: 110.45 }
const optionPoint = { spot: 70, callPayoff: 0, putPayoff: 30, callNet: -10.45, putNet: 24.43 }

export const optionResult: PricingResult = {
    kind: "OPTION",
    option: {
        call: optionSide,
        put: { price: 5.57, intrinsicValue: 0, timeValue: 5.57, breakEven: 94.43 },
        callMinusPut: 4.877058,
        parityRight: 4.877058,
        parityGap: 0,
        parityVerified: true,
        payoffGrid: [optionPoint, { ...optionPoint, spot: 130, callPayoff: 30, putPayoff: 0, callNet: 19.55, putNet: -5.57 }],
    },
}
