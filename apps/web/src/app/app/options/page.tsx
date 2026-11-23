import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageLayout } from "@/components/page-layout"
import { OptionsPage } from "@/features/pricing/options-page"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("navigation.tabs")
    return { title: t("options") }
}

export default async function OptionsRoute({ searchParams }: PageProps<"/app/options">) {
    const { symbol } = await searchParams
    return (
        <PageLayout>
            <OptionsPage symbol={typeof symbol === "string" && symbol ? symbol : null} />
        </PageLayout>
    )
}
