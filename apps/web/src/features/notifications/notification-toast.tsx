import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { notificationIcons } from "./constants"
import type { NotificationType } from "./types"

interface NotificationToastProps {
    type: NotificationType
    title: string
    detail: string
    onView: () => void
    onClose: () => void
}

/** Contenu du toaster `22.1` : icône d'état, titre, détail, « Voir » sous le texte et croix de fermeture. */
export function NotificationToast({ type, title, detail, onView, onClose }: NotificationToastProps) {
    const t = useTranslations("notifications")
    const { icon: Icon, className } = notificationIcons[type]

    return (
        <div className="flex w-95 max-w-full items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <Icon className={`size-5 shrink-0 ${className}`} />
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="text-body-semibold">{title}</span>
                <span className="text-small text-muted-foreground">{detail}</span>
                <Button variant="ghost" size="inline" onClick={onView}>
                    <span className="text-small-medium">{t("view")}</span>
                </Button>
            </div>
            <Button variant="ghost" size="inline" aria-label={t("close")} onClick={onClose}>
                <X className="size-3.5" />
            </Button>
        </div>
    )
}
