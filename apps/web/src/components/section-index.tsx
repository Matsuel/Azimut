import Link from "next/link"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/page-layout"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { SidebarSection } from "@/constants/sidebar"

/** Page d'index d'une section de la sidebar : titre, description et une carte cliquable par onglet (icône, titre, description). */
export function SectionIndex({ section }: { section: SidebarSection }) {
    const t = useTranslations("navigation")

    return (
        <>
            <PageHeader title={t(`sections.${section.key}`)} description={t(`sectionDescriptions.${section.key}`)} />
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {section.tabs.map((tab) => (
                    <Link
                        key={tab.url}
                        href={tab.url}
                        className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <Card className="h-full transition-colors hover:ring-foreground/25">
                            <CardHeader>
                                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted [&_svg]:size-5">
                                    {tab.icon}
                                </div>
                                <CardTitle>{t(`tabs.${tab.key}`)}</CardTitle>
                                <CardDescription>{t(`descriptions.${tab.key}`)}</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </>
    )
}
