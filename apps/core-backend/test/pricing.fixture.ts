import type { PricingInput, PricingResult } from "@azimut/contracts"

export const pricingInput: PricingInput = {
    kind: "BOND",
    bond: { nominal: 100, couponRate: 0, maturityYears: 5, discount: { source: "FLAT", rate: 0.03 }, valueDate: "2026-10-28" },
}

export const pricingResult: PricingResult = {
    kind: "BOND",
    bond: {
        rate: 0.03,
        discountSource: "FLAT",
        curveDate: null,
        price: 86.26,
        macaulayDuration: 5,
        modifiedDuration: 4.8544,
        priceChangeOnRatePlusOnePoint: -0.048544,
        flows: [{ year: 5, date: "2031-10-28", cashFlow: 100, discountFactor: 0.862609, presentValue: 86.26 }],
    },
}
