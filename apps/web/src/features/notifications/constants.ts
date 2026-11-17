import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import type { NotificationCategory, NotificationType } from "./types"

// Onglets de la page : le filtre envoyé à l'API (`category`, `unread`). Les nombres affichés viennent de `counts`.
export const notificationTabs = {
    all: {},
    unread: { unread: true },
    BACKTESTS: { category: "BACKTESTS" },
    RISK: { category: "RISK" },
} as const satisfies Record<string, { category?: NotificationCategory; unread?: boolean }>

export type NotificationTab = keyof typeof notificationTabs

// Icône et couleur d'état de chaque type (maquette 22)
export const notificationIcons = {
    BACKTEST_COMPLETED: { icon: CheckCircle2, className: "text-success" },
    PROJECTION_COMPLETED: { icon: CheckCircle2, className: "text-success" },
    BACKTEST_FAILED: { icon: XCircle, className: "text-destructive" },
    RISK_CONSTRAINT_VIOLATED: { icon: AlertTriangle, className: "text-warning" },
} as const satisfies Record<NotificationType, { icon: unknown; className: string }>

// Toaster (D13) : notifications empilées au plus, et durée avant fermeture automatique
export const MAX_TOASTS = 3
export const TOAST_DURATION_MS = 8000
