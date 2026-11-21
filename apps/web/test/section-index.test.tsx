import { afterEach, expect, test } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import en from "../messages/en.json"
import fr from "../messages/fr.json"
import { SectionIndex } from "../src/components/section-index"
import { sidebarSections } from "../src/constants/sidebar"

afterEach(cleanup)

const section = (key: string) => sidebarSections.find((s) => s.key === key)!

test("l'index d'une section affiche son titre et une carte par onglet, liée à la bonne page", () => {
    const analysis = section("analysis")
    render(
        <NextIntlClientProvider locale="fr" messages={fr}>
            <SectionIndex section={analysis} />
        </NextIntlClientProvider>,
    )

    expect(screen.getByRole("heading", { name: "Analyse" })).toBeTruthy()
    expect(screen.getByText(fr.navigation.sectionDescriptions.analysis)).toBeTruthy()
    const links = screen.getAllByRole("link")
    expect(links.map((link) => link.getAttribute("href"))).toEqual(analysis.tabs.map((tab) => tab.url))
    for (const tab of analysis.tabs) {
        expect(screen.getByText(fr.navigation.tabs[tab.key])).toBeTruthy()
        expect(screen.getByText(fr.navigation.descriptions[tab.key])).toBeTruthy()
    }
})

test("l'index suit la langue du provider", () => {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <SectionIndex section={section("laboratory")} />
        </NextIntlClientProvider>,
    )

    expect(screen.getByRole("heading", { name: "Laboratory" })).toBeTruthy()
    expect(screen.getByText(en.navigation.descriptions.backtests)).toBeTruthy()
})

test("les dictionnaires décrivent chaque onglet et chaque section", () => {
    for (const dictionary of [fr, en]) {
        for (const s of sidebarSections) {
            expect(dictionary.navigation.sectionDescriptions[s.key]).toBeTruthy()
            for (const tab of s.tabs) expect(dictionary.navigation.descriptions[tab.key]).toBeTruthy()
        }
    }
})
