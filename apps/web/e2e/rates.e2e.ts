import { expect, test } from "@playwright/test"

// Courbe servie par le faux market-service (e2e/fake-market.ts) via le proxy de core-backend ; le calcul passe par
// core-backend, Kafka et backtest-engine. Les chiffres exacts sont testés par l'engine, ici on vérifie que chaque étape arrive à l'écran.

test("la page Taux montre la courbe des taux US et la mention « Taux US seulement »", async ({ page }) => {
    await page.goto("/app/rates")

    await expect(page.getByRole("heading", { name: "Taux et obligations" })).toBeVisible()
    await expect(page.getByText("Taux US seulement")).toBeVisible()
    for (const symbol of ["^IRX", "^FVX", "^TNX", "^TYX"])
        await expect(page.getByText(symbol, { exact: true })).toBeVisible()
    await expect(page.getByText("Saisissez une obligation, puis calculez son prix.")).toBeVisible()
})

test("calculer le prix d'un zéro-coupon affiche le résultat, les flux et la méthode", async ({ page }) => {
    await page.goto("/app/rates")

    await page.getByRole("button", { name: "Calculer le prix" }).click()

    await expect(page.getByText("Prix actualisé")).toBeVisible()
    await expect(page.getByText("Duration modifiée")).toBeVisible()
    await expect(page.getByText("1 à 4")).toBeVisible()
    await expect(page.getByText("Total", { exact: true })).toBeVisible()
    await expect(page.getByText(/taux euro saisi/)).toBeVisible()
})

test("avec le taux de la courbe, le point interpolé est annoncé, puis « Réinitialiser » efface le résultat", async ({
    page,
}) => {
    await page.goto("/app/rates")

    await page.getByRole("tab", { name: "Courbe US interpolée" }).click()
    await page.getByRole("spinbutton", { name: "Maturité (années)" }).fill("7")
    await page.getByRole("button", { name: "Calculer le prix" }).click()

    await expect(page.getByText(/Interpolé · /)).toBeVisible()
    await expect(page.getByText(/courbe US interpolée/).last()).toBeVisible()

    await page.getByRole("button", { name: "Réinitialiser" }).click()

    await expect(page.getByText("Saisissez une obligation, puis calculez son prix.")).toBeVisible()
})

test("une maturité hors de 1 à 30 ans est refusée dans le formulaire", async ({ page }) => {
    await page.goto("/app/rates")

    await page.getByRole("spinbutton", { name: "Maturité (années)" }).fill("40")
    await page.getByRole("button", { name: "Calculer le prix" }).click()

    await expect(page.getByText("La maturité est un nombre entier d’années, de 1 à 30.")).toBeVisible()
})
