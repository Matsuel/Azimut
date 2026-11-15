import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageLayout } from "@/components/page-layout"
import { BacktestRisk } from "@/features/risk/backtest-risk"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("navigation.tabs")
    return { title: t("risk") }
}

export default async function RiskPage({ searchParams }: PageProps<"/app/risk">) {
    const { backtest } = await searchParams
    return (
        <PageLayout>
            <BacktestRisk backtestId={typeof backtest === "string" ? backtest : ""} />
        </PageLayout>
    )
}
