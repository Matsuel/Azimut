import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageHeader, PageLayout } from "@/components/page-layout"
import { SettingsTabs } from "@/features/settings/settings-tabs"
import { requireSession } from "@/lib/session"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("settings")
    return { title: t("title") }
}

export default async function SettingsPage() {
    const t = await getTranslations("settings")
    const { user } = await requireSession()

    return (
        <PageLayout>
            <PageHeader title={t("title")} description={t("description")} />
            <SettingsTabs user={user} />
        </PageLayout>
    )
}
