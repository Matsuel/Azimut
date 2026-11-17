import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import fr from "../messages/fr.json"
import type { NotificationList, NotificationView } from "../src/features/notifications/types"

const getNotifications = mock<(params: object) => Promise<NotificationList>>()
const getUnreadCount = mock(async () => ({ count: 2 }))
const markNotificationRead = mock<(id: string) => Promise<void>>(async () => {})
const markAllNotificationsRead = mock(async () => {})
mock.module("../src/features/notifications/api", () => ({
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
}))
const push = mock<(url: string) => void>(() => {})
mock.module("next/navigation", () => ({ useRouter: () => ({ push }) }))

const { NotificationCenter } = await import("../src/features/notifications/notification-center")
const { dayGroup } = await import("../src/features/notifications/utils")

afterEach(cleanup)
beforeEach(() => {
    getNotifications.mockReset()
    markNotificationRead.mockClear()
    markAllNotificationsRead.mockClear()
    push.mockClear()
})

const inFrench = (node: ReactNode) =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <NextIntlClientProvider locale="fr" messages={fr}>
                {node}
            </NextIntlClientProvider>
        </QueryClientProvider>,
    )

const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
const completed: NotificationView = {
    id: "n1",
    type: "BACKTEST_COMPLETED",
    category: "BACKTESTS",
    params: { backtestId: "b1", name: "Portefeuille A", cagr: 0.098, sharpe: 0.74, maxDrawdown: 0.214 },
    createdAt: ago(5 * 60_000),
    readAt: null,
}
const violated: NotificationView = {
    id: "n2",
    type: "RISK_CONSTRAINT_VIOLATED",
    category: "RISK",
    params: { backtestId: "b1", name: "Portefeuille A", maxDrawdown: 0.214, limit: 0.15 },
    createdAt: ago(10 * 86_400_000),
    readAt: ago(86_400_000),
}
const list = (data: NotificationView[]): NotificationList => ({
    data,
    count: data.length,
    page: 1,
    pageSize: 20,
    counts: { all: data.length, unread: 1, BACKTESTS: 1, RISK: 1 },
    retentionDays: 90,
})

test("liste : groupes par jour, texte traduit, onglets avec nombres de l'API, rétention", async () => {
    getNotifications.mockResolvedValue(list([completed, violated]))
    inFrench(<NotificationCenter />)

    expect(await screen.findByText("Backtest terminé")).toBeDefined()
    expect(screen.getByText("Aujourd’hui")).toBeDefined()
    expect(screen.getByText("Plus ancien")).toBeDefined()
    expect(screen.getByText(/CAGR 9,8 %, Sharpe 0,74, max drawdown .*21,4 %/)).toBeDefined()
    expect(screen.getByText(/pour une limite de 15 %/)).toBeDefined()
    expect(screen.getByRole("tab", { name: "Toutes · 2" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Non lues · 1" })).toBeDefined()
    expect(screen.getByText("Conservées 90 jours")).toBeDefined()
    expect(screen.getByText("1 non lue")).toBeDefined()
})

test("onglet Non lues : filtre envoyé à l'API", async () => {
    getNotifications.mockResolvedValue(list([completed]))
    inFrench(<NotificationCenter />)
    await screen.findByText("Backtest terminé")

    fireEvent.click(screen.getByRole("tab", { name: "Non lues · 1" }))
    await waitFor(() => expect(getNotifications).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, unread: true }))
})

test("« Voir » marque lue une notification non lue et ouvre le résultat", async () => {
    getNotifications.mockResolvedValue(list([completed, violated]))
    inFrench(<NotificationCenter />)
    await screen.findByText("Backtest terminé")

    const [viewCompleted, viewViolated] = screen.getAllByRole("button", { name: "Voir" })
    fireEvent.click(viewViolated)
    expect(markNotificationRead).not.toHaveBeenCalled() // déjà lue
    expect(push).toHaveBeenLastCalledWith("/app/risk?backtest=b1")
    fireEvent.click(viewCompleted)
    await waitFor(() => expect(markNotificationRead.mock.calls[0]?.[0]).toBe("n1"))
    expect(push).toHaveBeenLastCalledWith("/app/backtest/b1")
})

test("« Tout marquer comme lu » appelle l'API ; état vide sans notification", async () => {
    getNotifications.mockResolvedValue(list([completed]))
    inFrench(<NotificationCenter />)
    await screen.findByText("Backtest terminé")
    fireEvent.click(screen.getByRole("button", { name: "Tout marquer comme lu" }))
    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledTimes(1))

    cleanup()
    getNotifications.mockResolvedValue({ ...list([]), counts: { all: 0, unread: 0, BACKTESTS: 0, RISK: 0 } })
    inFrench(<NotificationCenter />)
    expect(await screen.findByText("Aucune notification.")).toBeDefined()
})

test("dayGroup : aujourd'hui, hier, cette semaine, plus ancien", () => {
    const now = new Date(2026, 10, 17, 12)
    expect(dayGroup(new Date(2026, 10, 17, 1).toISOString(), now)).toBe("today")
    expect(dayGroup(new Date(2026, 10, 16, 23).toISOString(), now)).toBe("yesterday")
    expect(dayGroup(new Date(2026, 10, 12).toISOString(), now)).toBe("week")
    expect(dayGroup(new Date(2026, 10, 1).toISOString(), now)).toBe("older")
})
