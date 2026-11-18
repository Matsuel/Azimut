import { afterEach, expect, spyOn, test } from "bun:test"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import fr from "../messages/fr.json"
import { ResultDetails } from "../src/features/backtest/result/result-details"
import type { BacktestDetails } from "../src/features/backtest/types"

const pending = { executions: [], result: null } as unknown as BacktestDetails
const completed = { executions: [], result: { holdings: [] } } as unknown as BacktestDetails

const ui = (backtest: BacktestDetails) => (
    <NextIntlClientProvider locale="fr" messages={fr}>
        <ResultDetails backtest={backtest} />
    </NextIntlClientProvider>
)

afterEach(() => {
    spyOn(console, "error").mockRestore()
})

test("le résultat qui arrive (polling) replie l'historique sans changer le defaultOpen d'un Collapsible monté", () => {
    const error = spyOn(console, "error").mockImplementation(() => {})
    const { rerender } = render(ui(pending))
    expect(screen.getByRole("button", { name: /Historique/ }).getAttribute("aria-expanded")).toBe("true")

    rerender(ui(completed))

    expect(error).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /Historique/ }).getAttribute("aria-expanded")).toBe("false")
})
