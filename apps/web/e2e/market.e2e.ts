import { expect, test } from "@playwright/test"

// Cours servis par le faux market-service (e2e/fake-market.ts) via le proxy de core-backend

test("la page Marché liste les actifs suivis et ouvre le détail d'un symbole", async ({ page }) => {
    await page.goto("/app/market")

    await expect(page.getByText("Microsoft Corporation")).toBeVisible()
    await page.getByText("Apple Inc.").click()

    await expect(page).toHaveURL(/\/app\/market\/AAPL$/)
    await expect(page.getByText(/AAPL · points toutes les/)).toBeVisible()
})

test("la recherche de symbole propose les résultats et ouvre celui choisi", async ({ page }) => {
    await page.goto("/app/market")

    await page.getByRole("button", { name: "Rechercher un symbole…" }).click()
    await page.getByRole("combobox").fill("gold")
    await page.getByRole("option", { name: /GLD/ }).click()

    await expect(page).toHaveURL(/\/app\/market\/GLD$/)
})
