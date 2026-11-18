import { cn } from "@/lib/utils"
import { notificationIcons } from "./constants"
import type { NotificationType } from "./types"

/** Icône d'état d'une notification (succès, échec, avertissement) selon son type, dans un rond bordé. */
export function NotificationIcon({ type, className }: { type: NotificationType; className?: string }) {
    const { icon: Icon, className: color } = notificationIcons[type]
    return (
        <span
            className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border bg-background",
                className,
            )}
        >
            <Icon className={cn("size-4", color)} />
        </span>
    )
}
