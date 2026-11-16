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
