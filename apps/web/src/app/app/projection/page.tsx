import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageLayout } from "@/components/page-layout"
import { BacktestProjection } from "@/features/projection/backtest-projection"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("navigation.tabs")
    return { title: t("projection") }
}

export default async function ProjectionPage({ searchParams }: PageProps<"/app/projection">) {
    const { backtest } = await searchParams
    return (
        <PageLayout>
            <BacktestProjection backtestId={typeof backtest === "string" ? backtest : ""} />
        </PageLayout>
    )
}
