import { expect, test } from "@playwright/test"
import { createBacktest, signUp, unique, waitForCompleted } from "./helpers"

// Compte propre à chaque parcours : la réinitialisation efface les données du compte, et le compte partagé sert aux autres tests
test.use({ storageState: { cookies: [], origins: [] } })

test("renommer l'utilisateur met à jour la sidebar ; l'onglet Portefeuille est désactivé", async ({ page }) => {
    await signUp(page.request)
    await page.goto("/app/settings")

    await expect(page.getByRole("tab", { name: "Portefeuille" })).toBeDisabled()

    const name = unique("Grace")
    await page.getByLabel("Nom complet").fill(name)
    await page.getByRole("button", { name: "Enregistrer" }).click()

    await expect(page.getByText("Profil enregistré.")).toBeVisible()
    await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible()
})

test("désactiver les notifications Backtests persiste après rechargement", async ({ page }) => {
    await signUp(page.request)
    await page.goto("/app/settings")
    await page.getByRole("tab", { name: "Notifications" }).click()

    const backtests = page.getByRole("switch", { name: "Backtests" })
    await expect(backtests).toBeChecked()
    await backtests.click()
    await expect(backtests).not.toBeChecked()

    await page.reload()
    await page.getByRole("tab", { name: "Notifications" }).click()
    await expect(page.getByRole("switch", { name: "Backtests" })).not.toBeChecked()

    await page.getByRole("switch", { name: "Backtests" }).click()
    await expect(page.getByRole("switch", { name: "Backtests" })).toBeChecked()
})

test("réinitialiser mes données vide les backtests, remet les préférences par défaut et garde la session", async ({
    page,
}) => {
    const request = page.request
    const user = await signUp(request)
    const { id, name } = await createBacktest(request)
    await waitForCompleted(request, id)

    await page.goto("/app/settings")
    await page.getByRole("tab", { name: "Notifications" }).click()
    await page.getByRole("switch", { name: "Backtests" }).click()
    await expect(page.getByRole("switch", { name: "Backtests" })).not.toBeChecked()

    await page.getByRole("tab", { name: "Profil" }).click()
    await page.getByRole("button", { name: "Réinitialiser", exact: true }).click()
    const confirm = page.getByRole("button", { name: "Réinitialiser mes données" })
    await expect(confirm).toBeDisabled()
    await page.getByLabel(/Saisissez RÉINITIALISER/).fill("RÉINITIALISER")
    await expect(confirm).toBeEnabled()
    await confirm.click()
    await expect(page.getByText("Vos données ont été réinitialisées.")).toBeVisible()

    await page.goto("/app/backtest")
    await expect(page.getByText("Aucun backtest.")).toBeVisible()
    await expect(page.getByText(name)).toHaveCount(0)
    // Toujours connecté : l'e-mail du compte reste affiché dans la sidebar
    await expect(page.getByText(user.email).first()).toBeVisible()

    await page.goto("/app/settings")
    await page.getByRole("tab", { name: "Notifications" }).click()
    await expect(page.getByRole("switch", { name: "Backtests" })).toBeChecked()
})
