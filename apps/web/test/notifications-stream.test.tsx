import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactElement } from "react"
import fr from "../messages/fr.json"
import type { NotificationView } from "../src/features/notifications/types"

const toast = {
    custom: mock<(render: (id: string) => ReactElement, options: { id: string }) => void>(() => {}),
    dismiss: mock<(id: string) => void>(() => {}),
}
mock.module("sonner", () => ({ toast, Toaster: () => null }))
mock.module("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }))
const getUnreadCount = mock(async () => ({ count: 3 }))
mock.module("../src/features/notifications/api", () => ({
    getNotifications: async () => ({}),
    getUnreadCount,
    markNotificationRead: async () => {},
    markAllNotificationsRead: async () => {},
}))

// happy-dom : l’URL courante (`location`) se fixe par `happyDOM.setURL`
const setUrl = (url: string) =>
    (window as unknown as { happyDOM: { setURL: (url: string) => void } }).happyDOM.setURL(url)

class FakeEventSource {
    static instances: FakeEventSource[] = []
    onopen: (() => void) | null = null
    listeners = new Map<string, (event: { data: string }) => void>()
    closed = false
    constructor(
        readonly url: string,
        readonly init?: { withCredentials?: boolean },
    ) {
        FakeEventSource.instances.push(this)
    }
    addEventListener(type: string, listener: (event: { data: string }) => void) {
        this.listeners.set(type, listener)
    }
    emit(data: string) {
        this.listeners.get("notification")?.({ data })
    }
    close() {
        this.closed = true
    }
}
globalThis.EventSource = FakeEventSource as unknown as typeof EventSource

const { NotificationToaster } = await import("../src/features/notifications/toaster")
const { UnreadBadge } = await import("../src/features/notifications/unread-badge")
const { SidebarProvider } = await import("../src/components/ui/sidebar")

afterEach(cleanup)
beforeEach(() => {
    FakeEventSource.instances = []
    toast.custom.mockClear()
    toast.dismiss.mockClear()
    getUnreadCount.mockClear()
    setUrl("http://localhost/app")
})

const notification: NotificationView = {
    id: "n1",
    type: "BACKTEST_FAILED",
    category: "BACKTESTS",
    params: { backtestId: "b1", name: "DCA World", errorCode: "NO_MARKET_DATA" },
    createdAt: new Date().toISOString(),
    readAt: null,
}

const renderToast = (element: ReactElement) =>
    render(
        <NextIntlClientProvider locale="fr" messages={fr}>
            {element}
        </NextIntlClientProvider>,
    )

const mountToaster = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="fr" messages={fr}>
                <SidebarProvider>
                    <UnreadBadge />
                    <NotificationToaster />
                </SidebarProvider>
            </NextIntlClientProvider>
        </QueryClientProvider>,
    )
    return { client, ...view }
}

test("un seul flux avec cookies ; notification reçue → toaster et rechargement du compteur", async () => {
    mountToaster()
    expect(FakeEventSource.instances).toHaveLength(1)
    const [source] = FakeEventSource.instances
    expect(source.url).toEndWith("/notifications/stream")
    expect(source.init?.withCredentials).toBe(true)
    await waitFor(() => expect(getUnreadCount).toHaveBeenCalledTimes(1))

    source.emit(JSON.stringify(notification))
    expect(toast.custom).toHaveBeenCalledTimes(1)
    const [render, options] = toast.custom.mock.calls[0]
    expect(options.id).toBe("n1")
    const { getByText } = renderToast(render("n1"))
    expect(getByText("Backtest en échec")).toBeTruthy()
    expect(getByText("DCA World · aucun cours disponible pour un des symboles")).toBeTruthy()
    await waitFor(() => expect(getUnreadCount).toHaveBeenCalledTimes(2))
})

test("reconnexion : le compteur est rechargé ; message illisible ignoré", async () => {
    mountToaster()
    const [source] = FakeEventSource.instances
    await waitFor(() => expect(getUnreadCount).toHaveBeenCalledTimes(1))

    source.emit("pas du json")
    expect(toast.custom).not.toHaveBeenCalled()
    source.onopen?.()
    await waitFor(() => expect(getUnreadCount).toHaveBeenCalledTimes(2))
})

test("pas de toaster sur la page Notifications (D15) ; le flux est fermé au démontage", () => {
    setUrl("http://localhost/app/notifications")
    const { unmount } = mountToaster()
    const [source] = FakeEventSource.instances
    source.emit(JSON.stringify(notification))
    expect(toast.custom).not.toHaveBeenCalled()
    unmount()
    expect(source.closed).toBe(true)
})
