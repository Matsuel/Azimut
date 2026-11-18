import { expect, test } from "@playwright/test"
import { createBacktest, waitForCompleted } from "./helpers"

// Viewport téléphone (projet « mobile ») : navigation par le menu replié et lecture d'un résultat

test("sur téléphone, le menu ouvre les pages et le détail d'un backtest reste lisible", async ({ page, request }) => {
    const { id, name } = await createBacktest(request)
    await waitForCompleted(request, id)

    await page.goto(`/app/backtest/${id}`)
    await expect(page.getByRole("heading", { name })).toBeVisible()
    await expect(page.getByText("Terminé", { exact: true }).first()).toBeVisible()
    // Aucun débordement horizontal de la page
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    await page.getByRole("button", { name: "Toggle Sidebar" }).click()
    await page.getByRole("link", { name: "Marché" }).click()
    await expect(page).toHaveURL(/\/app\/market$/)
})
