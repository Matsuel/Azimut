// Formes et unités définies une seule fois dans les contrats : notification, nombres des onglets et liste paginée
export type {
    NotificationCategory,
    NotificationCounts,
    NotificationList,
    NotificationType,
    NotificationView,
} from "@azimut/contracts"

// Réponse de GET /api/notifications/unread-count : nombre de notifications non lues (entier ≥ 0)
export type UnreadCount = { count: number }
