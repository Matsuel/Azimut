import { afterEach, expect, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import fr from "../messages/fr.json"
import { RollingWindows } from "../src/features/backtest/batch/rolling-windows"
import type { RollingWindow } from "../src/features/backtest/types"

afterEach(cleanup)

const windowOf = (years: number) =>
    ({
        years,
        count: 10,
        worst: -0.05,
        median: 0.06,
        best: 0.12,
        worstDate: "2020-03-02",
        negativeShare: 0.1,
        points: [{ date: "2020-03-02", value: -0.05 }],
    }) as RollingWindow

const renderWindows = (windows: RollingWindow[]) =>
    render(
        <NextIntlClientProvider locale="fr" messages={fr}>
            <RollingWindows windows={windows} />
        </NextIntlClientProvider>,
    )

const caption = () => screen.getByText(/Chaque point/).textContent

test("la courbe montre la fenêtre de 3 ans par défaut, une autre durée au choix de l'onglet", () => {
    renderWindows([windowOf(1), windowOf(3), windowOf(5)])
    expect(caption()).toContain("3 ans")

    fireEvent.click(screen.getByRole("tab", { name: "5 ans" }))

    expect(caption()).toContain("5 ans")
})

test("sans fenêtre de 3 ans (historique court), la première durée publiée est choisie", () => {
    renderWindows([windowOf(1)])

    expect(caption()).toContain("1 an")
})
