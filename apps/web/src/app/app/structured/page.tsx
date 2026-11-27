import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageLayout } from "@/components/page-layout"
import { StructuredPage } from "@/features/structured/structured-page"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("navigation.tabs")
    return { title: t("structured") }
}

export default function StructuredRoute() {
    return (
        <PageLayout>
            <StructuredPage />
        </PageLayout>
    )
}
