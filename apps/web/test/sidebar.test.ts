import { expect, test } from "bun:test"
import { Glob } from "bun"
import { sidebarSections, userTabs } from "../src/constants/sidebar"
import { findActiveTab, findSectionPage } from "../src/lib/navigation"
import { routes } from "../src/lib/routes"

test("le menu a six sections, l'administration étant la seule réservée aux admins", () => {
    expect(sidebarSections.map((s) => s.key)).toEqual([
        "laboratory",
        "analysis",
        "derivatives",
        "virtualTrading",
        "followUp",
        "administration",
    ])
    expect(sidebarSections.filter((s) => s.adminOnly).map((s) => s.key)).toEqual(["administration"])
})

test("chaque onglet n'apparaît qu'une fois dans le menu", () => {
    const urls = sidebarSections.flatMap((s) => s.tabs.map((t) => t.url))
    expect(new Set(urls).size).toBe(urls.length)
})

test("findActiveTab rattache une page à sa section", () => {
    expect(findActiveTab(routes.market)?.section).toBe("laboratory")
    expect(findActiveTab(routes.risk)?.section).toBe("analysis")
    expect(findActiveTab(routes.rates)?.section).toBe("derivatives")
    expect(findActiveTab(routes.notifications)?.section).toBe("followUp")
})

test("un onglet du menu du profil n'a pas de section", () => {
    for (const tab of userTabs) {
        expect(findActiveTab(tab.url)?.key).toBe(tab.key)
        expect(findActiveTab(tab.url)?.section).toBeUndefined()
    }
})

test("findSectionPage reconnaît la page d'index de chaque section et rien d'autre", () => {
    for (const section of sidebarSections) expect(findSectionPage(routes.section(section.key))?.key).toBe(section.key)
    expect(findSectionPage(routes.risk)).toBeUndefined()
    expect(findSectionPage(routes.section("unknown"))).toBeUndefined()
})

// Garde : une page ajoutée sans onglet ni page de section casserait le fil d'Ariane et le menu
test("chaque page statique de l'app est rattachée à un onglet ou à une page de section", () => {
    const appDir = `${import.meta.dir}/../src/app`
    const pages = [...new Glob("app/**/page.tsx").scanSync(appDir)]
    expect(pages.length).toBeGreaterThan(10)
    const orphans = pages
        .map((file) => `/${file.replace(/\/?page\.tsx$/, "").replace(/(^|\/)\([^/]+\)/g, "")}`.replace(/\/+/g, "/"))
        .filter((path) => !path.includes("["))
        .filter((path) => !findActiveTab(path) && !findSectionPage(path))
    expect(orphans).toEqual([])
})
