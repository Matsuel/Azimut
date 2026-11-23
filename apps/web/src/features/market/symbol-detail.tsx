import Link from "next/link"
import { useTranslations } from "next-intl"
import { SymbolCell } from "@/components/data-table/cells"
import { PageHeader } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { routes } from "@/lib/routes"
import { PriceChart } from "./price-chart"
import { SymbolSheet } from "./symbol-sheet"

export function SymbolDetail({ symbol }: { symbol: string }) {
    const t = useTranslations("market.sheet")

    return (
        <>
            <PageHeader
                leading={<SymbolCell symbol={symbol} size="lg" />}
                actions={
                    <>
                        <Button
                            variant="outline"
                            nativeButton={false}
                            render={<Link href={routes.symbolOptions(symbol)} />}
                        >
                            {t("optionTrigger")}
                        </Button>
                        <SymbolSheet symbol={symbol} />
                    </>
                }
            />

            <PriceChart symbol={symbol} />
        </>
    )
}
