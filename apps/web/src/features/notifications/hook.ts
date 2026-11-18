import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    getNotifications,
    getUnreadCount,
    markAllNotificationsRead,
    markNotificationRead,
    type NotificationFilters,
} from "./api"

// Clé commune : une invalidation de `["notifications"]` rafraîchit la liste, ses onglets et le compteur
export const notificationsKey = ["notifications"] as const

export function useNotifications(params: { page: number; pageSize: number } & NotificationFilters) {
    return useQuery({
        queryKey: [...notificationsKey, "list", params],
        queryFn: () => getNotifications(params),
        placeholderData: keepPreviousData, // garde la liste affichée pendant le changement d'onglet ou de page
    })
}

export function useUnreadCount() {
    return useQuery({ queryKey: [...notificationsKey, "unread-count"], queryFn: getUnreadCount })
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
    })
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: markAllNotificationsRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
    })
}
