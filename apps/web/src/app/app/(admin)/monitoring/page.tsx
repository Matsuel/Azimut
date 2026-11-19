import type { Metadata } from "next"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"
import { PageHeader, PageLayout } from "@/components/page-layout"
import { MonitoringOverview } from "@/features/monitoring/monitoring-overview"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("navigation.tabs")
    return { title: t("monitoring") }
}

export default function MonitoringPage() {
    const t = useTranslations()

    return (
        <PageLayout>
            <PageHeader title={t("navigation.tabs.monitoring")} description={t("pages.monitoring.description")} />
            <MonitoringOverview />
        </PageLayout>
    )
}
