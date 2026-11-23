import { expect, test } from "bun:test"
import { renderHook } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import fr from "../messages/fr.json"
import { useFormatters } from "../src/lib/format"

const normalize = (text: string) => text.replace(/[  ]/g, " ")

test("formatAxis : compact à partir du million pour tenir dans l'axe, entier en dessous", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <NextIntlClientProvider locale="fr" messages={fr}>
            {children}
        </NextIntlClientProvider>
    )
    const { formatAxis } = renderHook(() => useFormatters(), { wrapper }).result.current

    expect(normalize(formatAxis(2_600_000))).toBe("2,6 M")
    expect(normalize(formatAxis(650_000))).toBe("650 000")
    expect(formatAxis(5)).toBe("5")
    expect(formatAxis(0)).toBe("0")
})

// Formatters de la page Taux : taux à 2 décimales fixes, facteur d'actualisation à 4, durations en années à 2
test("formatPercent2, formatFactor et formatYears2 : décimales fixes, même pour un nombre rond", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <NextIntlClientProvider locale="fr" messages={fr}>
            {children}
        </NextIntlClientProvider>
    )
    const { result } = renderHook(() => useFormatters(), { wrapper })

    expect(normalize(result.current.formatPercent2(0.0421))).toBe("4,21 %")
    expect(normalize(result.current.formatPercent2(0.04))).toBe("4,00 %")
    expect(result.current.formatFactor(0.862609)).toBe("0,8626")
    expect(result.current.formatParityGap(0)).toBe("0,000000")
    expect(result.current.formatDecimal2(40)).toBe("40,00")
    expect(normalize(result.current.formatDays(182))).toBe("182 jours")
    expect(normalize(result.current.formatYears2(5))).toBe("5,00 ans")
    expect(normalize(result.current.formatYears2(4.8544))).toBe("4,85 ans")
})
