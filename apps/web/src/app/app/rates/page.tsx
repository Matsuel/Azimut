import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageLayout } from "@/components/page-layout"
import { RatesPage } from "@/features/pricing/rates-page"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("navigation.tabs")
    return { title: t("rates") }
}

export default function RatesRoute() {
    return (
        <PageLayout>
            <RatesPage />
        </PageLayout>
    )
}
