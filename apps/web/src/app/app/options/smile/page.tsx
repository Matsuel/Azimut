import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageLayout } from "@/components/page-layout"
import { OptionChainPage } from "@/features/pricing/chain-page"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("pages.optionChain")
    return { title: t("title") }
}

export default async function OptionChainRoute({ searchParams }: PageProps<"/app/options/smile">) {
    const { symbol } = await searchParams
    const value = typeof symbol === "string" && symbol ? symbol : null
    // La clé relance le calcul quand le symbole change
    return (
        <PageLayout>
            <OptionChainPage key={value} symbol={value} />
        </PageLayout>
    )
}
