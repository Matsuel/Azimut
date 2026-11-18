import { expect, test } from "@playwright/test"
import { unique } from "./helpers"

// Parcours sans session : ce fichier ignore le compte partagé
test.use({ storageState: { cookies: [], origins: [] } })

test("une page de l'app sans session renvoie vers la connexion, puis y revient une fois connecté", async ({ page }) => {
    const email = `${unique("login").replace(" ", "-")}@azimut.test`
    const password = "e2e-password-123"

    await page.goto("/register")
    await page.getByLabel("Nom").fill("Ada E2E")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Mot de passe").fill(password)
    await page.getByRole("button", { name: "Créer le compte" }).click()
    await expect(page).toHaveURL(/\/app$/)

    await page.context().clearCookies()
    await page.goto("/app/backtest")
    await expect(page).toHaveURL(/\/login\?redirect=%2Fapp%2Fbacktest$/)

    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Mot de passe").fill(password)
    await page.getByRole("button", { name: "Se connecter" }).click()
    await expect(page).toHaveURL(/\/app\/backtest$/)
    await expect(page.getByRole("heading", { name: "Backtests" })).toBeVisible()
})

test("se déconnecter depuis le menu du profil ramène à la connexion et ferme l'accès à l'app", async ({ page }) => {
    const email = `${unique("logout").replace(" ", "-")}@azimut.test`
    await page.goto("/register")
    await page.getByLabel("Nom").fill("Grace E2E")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Mot de passe").fill("e2e-password-123")
    await page.getByRole("button", { name: "Créer le compte" }).click()
    await expect(page).toHaveURL(/\/app$/)

    await page.getByRole("button", { name: /Grace E2E/ }).click()
    await page.getByRole("menuitem", { name: "Se déconnecter" }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.goto("/app")
    await expect(page).toHaveURL(/\/login\?redirect=%2Fapp$/)
})

test("un mot de passe trop court est refusé avant tout envoi", async ({ page }) => {
    await page.goto("/register")
    await page.getByLabel("Nom").fill("Ada E2E")
    await page.getByLabel("Email").fill("court@azimut.test")
    await page.getByLabel("Mot de passe").fill("123")
    await page.getByRole("button", { name: "Créer le compte" }).click()

    await expect(page.getByText("Au moins 8 caractères")).toBeVisible()
    await expect(page).toHaveURL(/\/register$/)
})
