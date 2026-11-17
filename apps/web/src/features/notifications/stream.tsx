"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { env } from "@/lib/env"
import { routes } from "@/lib/routes"
import { TOAST_DURATION_MS } from "./constants"
import { notificationsKey, useMarkNotificationRead } from "./hook"
import { NotificationIcon } from "./notification-icon"
import type { NotificationView } from "./types"
import { useNotificationText } from "./use-notification-text"
import { notificationRoute } from "./utils"

/**
 * Ouvre une seule fois le flux SSE `GET /api/notifications/stream` (cookies inclus) et, à chaque notification reçue,
 * rafraîchit liste, onglets et compteur, puis affiche un toaster sauf sur la page Notifications (D15).
 * À l'ouverture et à chaque reconnexion d'`EventSource`, recharge aussi les données : pas de rejeu côté serveur (D11).
 */
export function useNotificationStream() {
    const queryClient = useQueryClient()
    const router = useRouter()
    const t = useTranslations("notifications")
    const text = useNotificationText()
    const markRead = useMarkNotificationRead()

    // Le flux vit toute la session : il lit les traductions et le routeur courants par une référence
    const latest = useRef({ t, text, markRead, router })
    useEffect(() => {
        latest.current = { t, text, markRead, router }
    })

    useEffect(() => {
        const source = new EventSource(`${env.NEXT_PUBLIC_API_URL}/notifications/stream`, { withCredentials: true })
        const refresh = () => queryClient.invalidateQueries({ queryKey: notificationsKey })

        source.onopen = refresh
        source.addEventListener("notification", (event) => {
            let notification: NotificationView
            try {
                notification = JSON.parse((event as MessageEvent<string>).data)
            } catch {
                return // message illisible : ignoré, la liste se recharge à la prochaine ouverture
            }
            refresh()
            const current = latest.current
            // Pas de toaster sur la page Notifications : la liste s'y met à jour (D15) ; `location` suit les navigations de Next
            if (window.location.pathname === routes.notifications) return
            const { title, detail } = current.text(notification)
            toast(title, {
                id: notification.id,
                description: detail,
                icon: <NotificationIcon type={notification.type} />,
                duration: TOAST_DURATION_MS,
                action: {
                    label: current.t("view"),
                    onClick: () => {
                        current.markRead.mutate(notification.id)
                        current.router.push(notificationRoute(notification))
                    },
                },
            })
        })
        return () => source.close()
    }, [queryClient])
}
