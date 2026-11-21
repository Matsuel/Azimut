import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { PageLayout } from "@/components/page-layout"
import { SectionIndex } from "@/components/section-index"
import { sidebarSections } from "@/constants/sidebar"
import { isAdmin, requireSession } from "@/lib/session"

/** Section de la sidebar désignée par `key`, ou 404 : section inconnue, ou réservée aux admins pour un non-admin. */
async function findVisibleSection(key: string) {
    await requireSession()
    const section = sidebarSections.find((candidate) => candidate.key === key)
    if (!section || (section.adminOnly && !(await isAdmin()))) notFound()
    return section
}

export async function generateMetadata({ params }: PageProps<"/app/sections/[section]">): Promise<Metadata> {
    const { section } = await params
    const t = await getTranslations("navigation.sections")
    const found = await findVisibleSection(section)
    return { title: t(found.key) }
}

export default async function SectionPage({ params }: PageProps<"/app/sections/[section]">) {
    const { section } = await params
    return (
        <PageLayout>
            <SectionIndex section={await findVisibleSection(section)} />
        </PageLayout>
    )
}
