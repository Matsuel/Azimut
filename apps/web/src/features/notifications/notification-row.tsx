import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { useFormatters } from "@/lib/format"
import { cn } from "@/lib/utils"
import { NotificationIcon } from "./notification-icon"
import type { NotificationView } from "./types"
import { useNotificationText } from "./use-notification-text"
import { formatWhen } from "./utils"

interface NotificationRowProps {
    notification: NotificationView
    now: Date
    onView: (notification: NotificationView) => void
}

/** Ligne de la liste (maquette 22) : icône d'état, titre, détail, date et catégorie, « Voir » et pastille « non lue ». */
export function NotificationRow({ notification, now, onView }: NotificationRowProps) {
    const t = useTranslations("notifications")
    const f = useFormatters()
    const { title, detail } = useNotificationText()(notification)
    const unread = notification.readAt === null

    return (
        <li className={cn("flex items-center gap-3 rounded-lg px-3 py-3", unread && "bg-muted")}>
            <NotificationIcon type={notification.type} />
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-body-medium">{title}</span>
                <span className="text-small">{detail}</span>
                <span className="text-small text-muted-foreground">
                    {formatWhen(f, notification.createdAt, now)} · {t(`categories.${notification.category}`)}
                </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => onView(notification)}>
                {t("view")}
            </Button>
            <span
                role={unread ? "img" : undefined}
                aria-label={unread ? t("unread", { count: 1 }) : undefined}
                className={cn("size-2 shrink-0 rounded-full", unread && "bg-info")}
            />
        </li>
    )
}
