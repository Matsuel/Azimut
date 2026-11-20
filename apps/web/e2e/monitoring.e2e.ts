import { expect, test } from "@playwright/test"
import { signUp, signUpAdmin } from "./helpers"

const SERVICES = ["core-backend", "market-service", "notification-service", "backtest-engine", "risk-engine"]

test.describe("page Monitoring", () => {
    // Comptes propres au parcours : le compte partagé des autres tests n'est pas administrateur
    test.use({ storageState: { cookies: [], origins: [] } })

    test("un administrateur voit la synthèse et une carte par service", async ({ page }) => {
        await signUpAdmin(page.request)

        await page.goto("/app/monitoring")

        await expect(page.getByRole("heading", { name: "Monitoring" })).toBeVisible()
        await expect(page.getByText("Services disponibles")).toBeVisible()
        await expect(page.getByText("Dégradés", { exact: true })).toBeVisible()
        await expect(page.getByText("Hors ligne", { exact: true }).first()).toBeVisible()
        for (const service of SERVICES) await expect(page.getByText(service, { exact: true })).toBeVisible()
        // Chaque carte affiche un état et un contrôle ; les valeurs exactes dépendent de la stack
        await expect(page.getByText(/Vérifié /)).toHaveCount(SERVICES.length)
    })

    test("un compte standard est redirigé vers le dashboard", async ({ page }) => {
        await signUp(page.request)

        await page.goto("/app/monitoring")

        await expect(page).toHaveURL(/\/app\/?$/)
        await expect(page.getByRole("link", { name: "Monitoring" })).toHaveCount(0)
        await expect(page.getByText("Services disponibles")).toHaveCount(0)
    })
})
