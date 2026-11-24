import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { toast } from "sonner"
import fr from "../messages/fr.json"
import type { NotificationPreferences, NotificationPreferencesUpdate } from "../src/features/settings/types"

const getNotificationPreferences = mock<() => Promise<NotificationPreferences>>()
const updateNotificationPreferences =
    mock<(update: NotificationPreferencesUpdate) => Promise<NotificationPreferences>>()
mock.module("../src/features/settings/api", () => ({
    getNotificationPreferences,
    updateNotificationPreferences,
    updateProfile: async () => {},
}))
const { NotificationPreferencesCard } = await import("../src/features/settings/notification-preferences-card")
const toastError = mock(() => "")
toast.error = toastError

beforeEach(() => {
    getNotificationPreferences.mockReset()
    updateNotificationPreferences.mockReset()
    toastError.mockClear()
})
afterEach(cleanup)

function renderCard() {
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <NextIntlClientProvider locale="fr" messages={fr}>
                <NotificationPreferencesCard />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    )
}

const toggle = (label: string) => screen.getByRole("switch", { name: label })
const backtests = fr.settings.notifications.categories.BACKTESTS.label
const risk = fr.settings.notifications.categories.RISK.label

test("affiche les valeurs reçues de l'API", async () => {
    getNotificationPreferences.mockResolvedValue({ BACKTESTS: true, RISK: false })
    renderCard()

    await waitFor(() => expect(toggle(backtests).getAttribute("aria-checked")).toBe("true"))
    expect(toggle(risk).getAttribute("aria-checked")).toBe("false")
})

test("bascule : interrupteur modifié aussitôt, PUT partiel d'une seule catégorie", async () => {
    getNotificationPreferences.mockResolvedValue({ BACKTESTS: true, RISK: true })
    updateNotificationPreferences.mockResolvedValue({ BACKTESTS: false, RISK: true })
    renderCard()
    await waitFor(() => expect(toggle(backtests).getAttribute("aria-checked")).toBe("true"))

    fireEvent.click(toggle(backtests))

    await waitFor(() => expect(toggle(backtests).getAttribute("aria-checked")).toBe("false"))
    expect(updateNotificationPreferences.mock.calls[0]?.[0]).toEqual({ BACKTESTS: false })
})

test("erreur de l'API : retour arrière et toast d'erreur", async () => {
    getNotificationPreferences.mockResolvedValue({ BACKTESTS: true, RISK: true })
    updateNotificationPreferences.mockRejectedValue(new Error("boom"))
    renderCard()
    await waitFor(() => expect(toggle(risk).getAttribute("aria-checked")).toBe("true"))

    fireEvent.click(toggle(risk))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(fr.settings.notifications.saveFailed))
    expect(toggle(risk).getAttribute("aria-checked")).toBe("true")
})

test("lecture en échec : message et « Réessayer »", async () => {
    getNotificationPreferences.mockRejectedValue(new Error("boom"))
    renderCard()

    expect(await screen.findByText(fr.settings.notifications.loadFailed)).toBeTruthy()
    expect(screen.getByRole("button", { name: fr.common.retry })).toBeTruthy()
})
