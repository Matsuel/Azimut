"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { TableCard } from "@/components/data-table/table-card"
import { TablePagination } from "@/components/data-table/table-pagination"
import { FilterTabs } from "@/components/filter-tabs"
import { PageHeader, PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PAGE_SIZE } from "@/constants/pagination"
import { type NotificationTab, notificationTabs } from "./constants"
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "./hook"
import { NotificationBody } from "./notification-body"
import type { NotificationView } from "./types"
import { notificationRoute } from "./utils"

/** Écran `22 · Notifications` : en-tête avec « n non lues » et « Tout marquer comme lu », onglets, liste groupée par jour, pagination. */
export function NotificationCenter() {
    const t = useTranslations("notifications")
    const tPage = useTranslations()
    const router = useRouter()
    const [tab, setTab] = useState<NotificationTab>("all")
    const [page, setPage] = useState(1)
    const query = useNotifications({ page, pageSize: PAGE_SIZE, ...notificationTabs[tab] })
    const markRead = useMarkNotificationRead()
    const markAllRead = useMarkAllNotificationsRead()
    const counts = query.data?.counts

    const tabOptions = (Object.keys(notificationTabs) as NotificationTab[]).map((value) => ({
        value,
        label: t(`tabs.${value}`, { count: counts?.[value === "all" ? "all" : "unread"] ?? 0 }),
    }))
    const changeTab = (value: NotificationTab) => {
        setTab(value)
        setPage(1)
    }
    const view = (notification: NotificationView) => {
        if (notification.readAt === null) markRead.mutate(notification.id)
        router.push(notificationRoute(notification))
    }

    return (
        <PageLayout>
            <PageHeader
                title={tPage("navigation.tabs.notifications")}
                description={tPage("pages.notifications.description")}
                badge={counts && counts.unread > 0 && <Badge>{t("unread", { count: counts.unread })}</Badge>}
                actions={
                    <Button onClick={() => markAllRead.mutate()} disabled={!counts?.unread || markAllRead.isPending}>
                        {t("markAllRead")}
                    </Button>
                }
            />
            <TableCard
                title={
                    <div className="max-w-full overflow-x-auto">
                        <FilterTabs value={tab} onChange={changeTab} options={tabOptions} />
                    </div>
                }
                actions={
                    query.data && (
                        <span className="text-small text-muted-foreground">
                            {t("retention", { days: query.data.retentionDays })}
                        </span>
                    )
                }
            >
                <NotificationBody query={query} onView={view} />
                <TablePagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    count={query.data?.count ?? 0}
                    onPageChange={setPage}
                />
            </TableCard>
        </PageLayout>
    )
}
