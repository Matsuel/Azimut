import { type APIRequestContext, expect, type Page } from "@playwright/test"
import { URLS } from "./env"

/** Fichier de session de l'utilisateur partagé par les parcours (écrit par `auth.setup.ts`). */
export const AUTH_FILE = "e2e/.auth/user.json"

/** Suffixe unique d'un nom de test : les parcours tournent en parallèle sur la même base. */
export const unique = (label: string) => `${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Compte neuf (better-auth) ; la session est posée en cookie dans `request`. `Origin` : better-auth refuse un POST sans origine de confiance. */
export async function signUp(request: APIRequestContext) {
    const email = `${unique("e2e").replace(" ", "-")}@azimut.test`
    const user = { name: "Ada E2E", email, password: "e2e-password-123" }
    const response = await request.post(`${URLS.api}/auth/sign-up/email`, {
        data: user,
        headers: { Origin: URLS.web },
    })
    expect(response.ok(), await response.text()).toBe(true)
    return user
}

// Période de quatre ans : plus de 250 jours de cotation communs, assez pour que risk-engine calcule le risque
const BACKTEST = {
    investmentMode: "LUMP_SUM",
    allocations: [
        { symbol: "AAPL", weight: 60 },
        { symbol: "GLD", weight: 40 },
    ],
    start: "2020-01-01T00:00:00.000Z",
    end: "2024-01-01T00:00:00.000Z",
    initialAmount: 10_000,
    rebalanceFrequency: "QUARTERLY",
    fee: 0.1,
    benchmarkSymbol: "URTH",
}

/** Crée un backtest par l'API (session de `request`) et renvoie son id ; `202` : l'exécution part dans Kafka, le résultat arrive plus tard. */
export async function createBacktest(request: APIRequestContext, name = unique("Backtest")) {
    const response = await request.post(`${URLS.api}/backtest`, { data: { ...BACKTEST, name } })
    expect(response.status(), await response.text()).toBe(202)
    const { id } = (await response.json()) as { id: string }
    return { id, name }
}

/** Attend que la dernière exécution du backtest soit `COMPLETED` (engine passé, résultat enregistré). */
export async function waitForCompleted(request: APIRequestContext, id: string) {
    await expect
        .poll(
            async () => {
                const response = await request.get(`${URLS.api}/backtest/${id}`)
                const { executions } = (await response.json()) as { executions: { status: string }[] }
                return executions[0]?.status
            },
            { timeout: 90_000, intervals: [1_000] },
        )
        .toBe("COMPLETED")
}

/** Choisit `date` (`YYYY-MM-DD`) dans le sélecteur de date du champ `label` : mois et année par les listes, puis le jour. */
export async function pickDate(page: Page, label: string, date: string) {
    const [year, month] = date.split("-").map(Number) as [number, number]
    await page.getByLabel(label, { exact: true }).click()
    const calendar = page.locator('[data-slot="calendar"]')
    await calendar.locator("select").nth(1).selectOption(String(year))
    await calendar
        .locator("select")
        .nth(0)
        .selectOption(String(month - 1))
    await calendar.locator(`[data-day="${date}"] button`).click()
    // Le calendrier reste ouvert après le choix (`DatePicker` ne le ferme pas)
    await page.keyboard.press("Escape")
    await expect(calendar).toBeHidden()
}
