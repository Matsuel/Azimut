import { afterEach, expect, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { ThemeProvider } from "next-themes"
import fr from "../messages/fr.json"
import { ThemeCard } from "../src/features/settings/theme-card"

afterEach(() => {
    cleanup()
    localStorage.clear()
})

test("choisir un thème l'applique et le marque actif, un seul à la fois", () => {
    render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <NextIntlClientProvider locale="fr" messages={fr}>
                <ThemeCard />
            </NextIntlClientProvider>
        </ThemeProvider>,
    )
    const tile = (name: string) => screen.getByRole("button", { name })
    expect(tile(fr.theme.system).getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(tile(fr.theme.dark))

    expect(tile(fr.theme.dark).getAttribute("aria-pressed")).toBe("true")
    expect(tile(fr.theme.system).getAttribute("aria-pressed")).toBe("false")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
})
