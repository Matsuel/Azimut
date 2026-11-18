import type { UseQueryResult } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { ErrorState, LoadingState } from "@/components/query-status"
import { NotificationGroups } from "./notification-groups"
import type { NotificationList, NotificationView } from "./types"

interface NotificationBodyProps {
    query: UseQueryResult<NotificationList>
    onView: (notification: NotificationView) => void
}

/** Corps de la carte : un seul état à la fois, chargement, erreur (« Réessayer »), vide ou liste groupée par jour. */
export function NotificationBody({ query, onView }: NotificationBodyProps) {
    const t = useTranslations("notifications")

    if (query.isPending) return <LoadingState className="h-40" />
    if (query.isError) return <ErrorState message={t("loadError")} onRetry={query.refetch} className="h-40" />
    if (query.data.data.length === 0)
        return <p className="py-10 text-center text-body text-muted-foreground">{t("empty")}</p>
    return <NotificationGroups notifications={query.data.data} onView={onView} />
}
