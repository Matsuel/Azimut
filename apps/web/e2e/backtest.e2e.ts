import { expect, test } from "@playwright/test"
import { createBacktest, pickDate, unique, waitForCompleted } from "./helpers"

// Un résultat passe par backtest-engine (Kafka) puis risk-engine : les assertions sur le statut attendent jusqu'à 90 s.
// Les chiffres exacts relèvent des tests de l'engine : ici, on vérifie que chaque étape arrive jusqu'à l'écran.
const RESULT_TIMEOUT = { timeout: 90_000 }

test("créer un backtest depuis le formulaire mène à son résultat, puis à son risque", async ({ page }) => {
    const name = unique("Formulaire")
    await page.goto("/app/backtest/new")

    await page.getByLabel("Nom du backtest").fill(name)
    await page.getByRole("button", { name: "Ajouter un actif" }).click()
    await page.getByRole("combobox").fill("Apple")
    await page.getByRole("option", { name: /AAPL/ }).click()
    await expect(page.getByText("Total : 100 %")).toBeVisible()
    await pickDate(page, "Début", "2020-01-02")
    await pickDate(page, "Fin", "2024-01-02")
    await page.getByRole("button", { name: "Lancer le backtest" }).click()

    await expect(page).toHaveURL(/\/app\/backtest\/[^/]+$/)
    await expect(page.getByRole("heading", { name })).toBeVisible()
    await expect(page.getByText("Terminé", { exact: true }).first()).toBeVisible(RESULT_TIMEOUT)
    await expect(page.getByText("Performance", { exact: true })).toBeVisible()

    // Le bouton-lien du détail (rôle button), pas l'entrée « Risque » de la sidebar
    await page.getByRole("main").getByRole("button", { name: "Risque", exact: true }).click()
    await expect(page).toHaveURL(/\/app\/risk\?backtest=/)
    await expect(page.getByText("Volatilité annualisée").first()).toBeVisible(RESULT_TIMEOUT)
})

test("relancer un backtest terminé crée une nouvelle exécution qui se termine", async ({ page, request }) => {
    const { id, name } = await createBacktest(request)
    await waitForCompleted(request, id)

    await page.goto(`/app/backtest/${id}`)
    await expect(page.getByRole("heading", { name })).toBeVisible()
    await page.getByRole("button", { name: "Relancer" }).click()

    // Une seule exécution active à la fois : le bouton reste désactivé jusqu'à la fin
    await expect(page.getByRole("button", { name: "Relancer" })).toBeDisabled()
    await expect(page.getByRole("button", { name: "Relancer" })).toBeEnabled(RESULT_TIMEOUT)
    await expect(page.getByText("Terminé", { exact: true }).first()).toBeVisible()
})

test("comparer deux backtests terminés affiche les deux côtés", async ({ page, request }) => {
    const [a, b] = await Promise.all([createBacktest(request), createBacktest(request)])
    await Promise.all([waitForCompleted(request, a.id), waitForCompleted(request, b.id)])

    await page.goto(`/app/backtest/compare?ids=${a.id},${b.id}`)

    await expect(page.getByText(a.name).first()).toBeVisible()
    await expect(page.getByText(b.name).first()).toBeVisible()
})

test("la liste des backtests montre un backtest créé avec son statut", async ({ page, request }) => {
    const { id, name } = await createBacktest(request)
    await waitForCompleted(request, id)

    await page.goto("/app/backtest")

    const row = page.getByRole("row", { name: new RegExp(name) })
    await expect(row).toBeVisible()
    await expect(row.getByText("Terminé")).toBeVisible()
    await row.getByText(name).click()
    await expect(page).toHaveURL(new RegExp(`/app/backtest/${id}$`))
})
