import { expect, test } from "@playwright/test"
import { signUp, signUpAdmin } from "./helpers"

// Le maillon de la page courante est un `span role="link"` : seuls les vrais liens (`a`) comptent
const breadcrumb = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "breadcrumb" })

test("le titre d'une section ouvre sa page d'index, dont une carte ouvre l'onglet", async ({ page }) => {
    await page.goto("/app")

    await page.locator("[data-slot=sidebar-group-label]", { hasText: "Laboratoire" }).click()

    await expect(page).toHaveURL(/\/app\/sections\/laboratory$/)
    await expect(page.getByRole("heading", { name: "Laboratoire" })).toBeVisible()
    await expect(breadcrumb(page).locator("a")).toHaveCount(0)
    await page
        .getByRole("main")
        .getByRole("link", { name: /Backtests/ })
        .click()
    await expect(page).toHaveURL(/\/app\/backtest$/)
})

test("sur une page d'onglet, la section du fil d'Ariane ramène à la page d'index", async ({ page }) => {
    await page.goto("/app/market")

    await breadcrumb(page).getByRole("link", { name: "Laboratoire" }).click()

    await expect(page).toHaveURL(/\/app\/sections\/laboratory$/)
})

test("la page Paramètres a un fil d'Ariane sans maillon de section", async ({ page }) => {
    await page.goto("/app/settings")

    await expect(breadcrumb(page).getByText("Compte")).toBeVisible()
    await expect(breadcrumb(page).locator("a")).toHaveCount(0)
})

test.describe("section Administration", () => {
    // Comptes propres au parcours : le compte partagé des autres tests n'est pas administrateur
    test.use({ storageState: { cookies: [], origins: [] } })

    test("un administrateur voit une carte par onglet d'administration", async ({ page }) => {
        await signUpAdmin(page.request)

        await page.goto("/app/sections/administration")

        await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible()
        for (const tab of ["Monitoring", "Utilisateurs", "Données de référence"])
            await expect(page.getByRole("main").getByRole("link", { name: new RegExp(tab) })).toBeVisible()
    })

    test("un compte standard et une section inconnue reçoivent une 404", async ({ page }) => {
        await signUp(page.request)

        expect((await page.goto("/app/sections/administration"))?.status()).toBe(404)
        expect((await page.goto("/app/sections/inconnue"))?.status()).toBe(404)
    })
})
