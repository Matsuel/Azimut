import { expect, test } from "bun:test"
import { sidebarSections } from "../src/constants/sidebar"
import { findActiveTab } from "../src/lib/navigation"
import { routes } from "../src/lib/routes"

test("le menu a cinq sections, l'administration étant la seule réservée aux admins", () => {
    expect(sidebarSections.map((s) => s.key)).toEqual([
        "laboratory",
        "analysis",
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
    expect(findActiveTab(routes.notifications)?.section).toBe("followUp")
})
