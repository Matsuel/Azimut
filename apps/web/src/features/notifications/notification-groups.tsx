import { useTranslations } from "next-intl"
import { NotificationRow } from "./notification-row"
import type { NotificationView } from "./types"
import { groupByDay } from "./utils"

interface NotificationGroupsProps {
    notifications: NotificationView[]
    onView: (notification: NotificationView) => void
}

/** Notifications d'une page, sous les titres « Aujourd'hui », « Hier », « Cette semaine » (regroupement d'affichage). */
export function NotificationGroups({ notifications, onView }: NotificationGroupsProps) {
    const t = useTranslations("notifications.groups")
    const now = new Date()

    return (
        <div className="flex flex-col gap-2">
            {groupByDay(notifications, now).map(({ group, items }) => (
                <section key={group} className="flex flex-col gap-1">
                    <h3 className="text-small text-muted-foreground">{t(group)}</h3>
                    <ul className="flex flex-col gap-1">
                        {items.map((n) => (
                            <NotificationRow key={n.id} notification={n} now={now} onView={onView} />
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    )
}
