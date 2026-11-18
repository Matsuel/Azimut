import { expect, test } from "@playwright/test"
import { createBacktest, signUp, waitForCompleted } from "./helpers"

// Compte propre à ce parcours : les autres tests créent des backtests en parallèle, donc des notifications
test.use({ storageState: { cookies: [], origins: [] } })

test("un backtest terminé produit une notification non lue, que l'on marque comme lue", async ({ page }) => {
    const request = page.request
    await signUp(request)
    const { id, name } = await createBacktest(request)
    await waitForCompleted(request, id)

    await page.goto("/app/notifications")

    await expect(page.getByText("Backtest terminé").first()).toBeVisible()
    await expect(page.getByText(new RegExp(name)).first()).toBeVisible()
    await expect(page.getByText(/Non lues · [1-9]/)).toBeVisible()

    await page.getByRole("button", { name: "Tout marquer comme lu" }).click()
    await expect(page.getByText("Non lues · 0")).toBeVisible()
})
