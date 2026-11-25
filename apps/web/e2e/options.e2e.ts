import { expect, test } from "@playwright/test"

// Entrées servies par le faux market-service (e2e/fake-market.ts) via le proxy de core-backend ; le calcul passe par
// core-backend, Kafka et backtest-engine. Les chiffres exacts sont testés par l'engine, ici on vérifie que chaque étape arrive à l'écran.

test("« Pricer une option » depuis la fiche AAPL ouvre le calculateur prérempli, puis le calcul affiche le résultat", async ({
    page,
}) => {
    await page.goto("/app/market/AAPL")

    await page.getByRole("button", { name: "Pricer une option" }).click()

    await expect(page).toHaveURL(/\/app\/options\?symbol=AAPL/)
    await expect(page.getByRole("heading", { name: "Calculateur d’option · AAPL" })).toBeVisible()
    await expect(page.getByRole("spinbutton", { name: "Spot" })).not.toHaveValue("")
    await expect(page.getByRole("spinbutton", { name: "Taux sans risque (%)" })).toHaveValue("4.32")
    await expect(page.getByRole("spinbutton", { name: "Dividende continu q (%)" })).toHaveValue("0.5")
    await expect(page.getByRole("spinbutton", { name: /^Volatilité/ })).toHaveValue("24.3")

    await page.getByRole("button", { name: "Calculer" }).click()

    await expect(page.getByText("Prix du call")).toBeVisible()
    await expect(page.getByText("Prix du put")).toBeVisible()
    await expect(page.getByText("Vérifiée", { exact: true })).toBeVisible()
    await expect(page.getByText("Gain ou perte à l’échéance")).toBeVisible()
    await expect(page.getByText("Grille de payoff")).toBeVisible()
    await expect(page.getByText("historique", { exact: true })).toBeVisible()
})

test("un symbole inconnu laisse les champs vides et la saisie manuelle possible", async ({ page }) => {
    await page.goto("/app/options?symbol=ZZZZ")

    await expect(page.getByText(/Les valeurs de ZZZZ n’ont pas pu être préremplies/)).toBeVisible()
    await expect(page.getByRole("spinbutton", { name: "Spot" })).toHaveValue("")

    await page.getByRole("spinbutton", { name: "Spot" }).fill("100")
    await page.getByRole("spinbutton", { name: "Strike" }).fill("100")
    await page.getByRole("spinbutton", { name: /^Volatilité/ }).fill("20")
    await page.getByRole("spinbutton", { name: "Dividende continu q (%)" }).fill("0")
    await page.getByRole("button", { name: "Calculer" }).click()

    await expect(page.getByText("Prix du call")).toBeVisible()
})

test("un spot vide est refusé dans le formulaire", async ({ page }) => {
    await page.goto("/app/options")

    await page.getByRole("button", { name: "Calculer" }).click()

    await expect(page.getByText("Le spot doit être supérieur à 0.")).toBeVisible()
})

test("« Volatilité implicite » ouvre Grecques et smile : la chaîne est calculée puis affichée, le filtre visible", async ({
    page,
}) => {
    await page.goto("/app/options?symbol=AAPL")

    await page.getByRole("button", { name: "Volatilité implicite" }).click()

    await expect(page).toHaveURL(/\/app\/options\/smile\?symbol=AAPL/)
    await expect(page.getByRole("heading", { name: "Grecques et smile · AAPL" })).toBeVisible()
    await expect(page.getByText("Contrats exploitables")).toBeVisible()
    await expect(page.getByText("Smile de volatilité")).toBeVisible()
    await expect(page.getByText("Sensibilités du prix d’une option, calculées automatiquement")).toBeVisible()
    await expect(page.getByText(/^Chaîne · échéance/)).toBeVisible()
    await expect(page.getByText("Écarté · bid/ask nuls").first()).toBeVisible()
})

test("un symbole inconnu : le calcul de la chaîne échoue avec sa cause", async ({ page }) => {
    await page.goto("/app/options/smile?symbol=ZZZZ")

    await expect(page.getByText(/Le calcul de la chaîne a échoué/)).toBeVisible()
})

test("« Pricing Monte Carlo » ouvre la simulation : prix, trajectoires, convergence et comparaison arrivent à l'écran", async ({
    page,
}) => {
    await page.goto("/app/options?symbol=AAPL")

    await page.getByRole("button", { name: "Pricing Monte Carlo" }).click()

    await expect(page).toHaveURL(/\/app\/options\/monte-carlo\?symbol=AAPL/)
    await expect(page.getByRole("heading", { name: "Pricing Monte Carlo · AAPL" })).toBeVisible()
    await expect(page.getByRole("spinbutton", { name: "Barrière" })).not.toHaveValue("")

    await page.getByRole("spinbutton", { name: "Trajectoires" }).fill("10000")
    await page.getByRole("button", { name: "Lancer la simulation" }).click()

    await expect(page.getByText("Prix Monte Carlo", { exact: true })).toBeVisible()
    await expect(page.getByText("Trajectoires simulées")).toBeVisible()
    await expect(page.getByText("Convergence du prix")).toBeVisible()
    await expect(page.getByText("Comparaison des méthodes")).toBeVisible()
    await expect(page.getByText(/KO \+ KI = .* = vanille/)).toBeVisible()
})
