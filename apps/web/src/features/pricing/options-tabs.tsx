"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { routes } from "@/lib/routes"

/** Onglets des pages Options (maquettes 36 et 37) : le calculateur, puis les grecques et le smile d'un même symbole. */
export function OptionsTabs({ active, symbol }: { active: "calculator" | "chain"; symbol: string | null }) {
    const t = useTranslations("pages.options.tabs")
    const calculator = symbol ? routes.symbolOptions(symbol) : routes.options
    const chain = symbol ? routes.symbolOptionsSmile(symbol) : routes.optionsSmile

    return (
        <Tabs value={active}>
            <TabsList>
                <TabsTrigger value="calculator" nativeButton={false} render={<Link href={calculator} />}>
                    {t("calculator")}
                </TabsTrigger>
                <TabsTrigger value="chain" nativeButton={false} render={<Link href={chain} />}>
                    {t("chain")}
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}
