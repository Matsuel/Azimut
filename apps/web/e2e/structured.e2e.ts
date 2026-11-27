import { expect, test } from "@playwright/test"

// Le calcul passe par core-backend, Kafka et backtest-engine, sans market-service : ici on vérifie que chaque étape arrive à l'écran
// (les chiffres exacts sont testés par l'engine).

test("la page Structuration price un capital garanti : cartes, décomposition et payoff arrivent à l'écran", async ({
    page,
}) => {
    await page.goto("/app/structured")

    await expect(page.getByRole("heading", { name: "Constructeur de produit" })).toBeVisible()
    await expect(page.getByLabel(/Prix client/)).toHaveCount(0)

    await page.getByRole("button", { name: "Pricer le produit" }).click()

    await expect(page.getByText("Somme des briques", { exact: true })).toBeVisible()
    await expect(page.getByText("Décomposition", { exact: true })).toBeVisible()
    await expect(page.getByText("Payoff à l’échéance")).toBeVisible()
    await expect(page.getByText(/Participation = budget d’option/)).toBeVisible()
})

test("l'autocallable affiche ses dates d'observation après le calcul", async ({ page }) => {
    await page.goto("/app/structured")

    await page.getByRole("tab", { name: "Autocallable" }).click()
    await page.getByRole("button", { name: "Pricer le produit" }).click()

    await expect(page.getByText("Autocallable · dates d’observation")).toBeVisible()
    await expect(page.getByText(/Pas de formule fermée/)).toBeVisible()
})
