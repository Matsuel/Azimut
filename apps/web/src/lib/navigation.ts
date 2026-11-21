import { type SidebarSection, type SidebarTab, sidebarSections, userTabs } from "@/constants/sidebar"
import { prefix, routes } from "@/lib/routes"

// `section` absente pour un onglet hors sidebar (`userTabs`)
export type ActiveTab = SidebarTab & { section?: SidebarSection["key"] }

const tabs: ActiveTab[] = [
    ...sidebarSections.flatMap((section) => section.tabs.map((tab) => ({ ...tab, section: section.key }))),
    ...userTabs,
]

// Le dashboard (racine) ne matche qu'exactement ; un autre onglet matche aussi ses sous-pages (détail d'un backtest)
const matches = (pathname: string, url: string) =>
    url === prefix ? pathname === url : pathname === url || pathname.startsWith(`${url}/`)

/**
 * Onglet de la sidebar ou du menu du profil qui correspond à `pathname`, avec la clé de sa section : le plus long préfixe d'URL gagne
 * (`/app/backtest/new` désigne « Backtests »). `undefined` hors du menu et du profil.
 */
export function findActiveTab(pathname: string): ActiveTab | undefined {
    return tabs.filter((tab) => matches(pathname, tab.url)).sort((a, b) => b.url.length - a.url.length)[0]
}

/** Section dont `pathname` est la page d'index (`routes.section`), `undefined` sinon. */
export function findSectionPage(pathname: string): SidebarSection | undefined {
    return sidebarSections.find((section) => pathname === routes.section(section.key))
}
