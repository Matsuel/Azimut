import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { NotificationCenter } from "@/features/notifications/notification-center"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("navigation.tabs")
    return { title: t("notifications") }
}

export default function NotificationsPage() {
    return <NotificationCenter />
}
