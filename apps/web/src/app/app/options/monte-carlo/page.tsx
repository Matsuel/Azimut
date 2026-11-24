import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageLayout } from "@/components/page-layout"
import { MonteCarloPage } from "@/features/pricing/monte-carlo-page"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("pages.optionMonteCarlo")
    return { title: t("title") }
}

export default async function OptionMonteCarloRoute({ searchParams }: PageProps<"/app/options/monte-carlo">) {
    const { symbol } = await searchParams
    return (
        <PageLayout>
            <MonteCarloPage symbol={typeof symbol === "string" && symbol ? symbol : null} />
        </PageLayout>
    )
}
