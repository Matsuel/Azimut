import type { NotificationCategory } from "@azimut/contracts"
import { apiFetch } from "@/lib/api"
import type { PaginationParams } from "@/lib/pagination"
import type { NotificationList, UnreadCount } from "./types"

export type NotificationFilters = { category?: NotificationCategory; unread?: boolean }

export async function getNotifications(params: PaginationParams & NotificationFilters): Promise<NotificationList> {
    const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
    if (params.category) query.set("category", params.category)
    if (params.unread !== undefined) query.set("unread", String(params.unread))
    return apiFetch<NotificationList>(`/notifications?${query}`)
}

export async function getUnreadCount(): Promise<UnreadCount> {
    return apiFetch<UnreadCount>("/notifications/unread-count")
}

export async function markNotificationRead(id: string): Promise<void> {
    return apiFetch<void>(`/notifications/${id}/read`, { method: "POST" })
}

export async function markAllNotificationsRead(): Promise<void> {
    return apiFetch<void>("/notifications/read-all", { method: "POST" })
}
