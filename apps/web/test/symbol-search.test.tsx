import { afterEach, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import fr from "../messages/fr.json"
import { SearchResults, searchState } from "../src/components/symbol-search-results"
import { Command, CommandList } from "../src/components/ui/command"
import type { MarketData } from "../src/features/market/types"

afterEach(cleanup)

const apple = { symbol: "AAPL", name: "Apple", exchange: "NMS", assetType: "EQUITY" } as MarketData
const msft = { symbol: "MSFT", name: "Microsoft", exchange: "NMS", assetType: "EQUITY" } as MarketData
const idle = { data: [apple, msft], error: null, isLoading: false }

test.each([
    ["ap", "ap", idle, "tooShort"],
    ["appl", "app", idle, "searching"],
    ["app", "app", { ...idle, isLoading: true }, "searching"],
    ["app", "app", { ...idle, error: new Error("502") }, "error"],
    ["app", "app", { ...idle, data: [apple] }, "empty"],
])("searchState(%p, débouncée %p) : %s", (query, debounced, search, kind) => {
    expect(searchState(query, debounced, search, ["AAPL"]).kind).toBe(kind as never)
})

test("searchState : résultats sans les symboles exclus", () => {
    expect(searchState("app", "app", idle, ["AAPL"])).toEqual({ kind: "results", results: [msft] })
})

const renderResults = (state: ReturnType<typeof searchState>, onPick = mock()) =>
    render(
        <NextIntlClientProvider locale="fr" messages={fr}>
            <Command shouldFilter={false}>
                <CommandList>
                    <SearchResults state={state} query="zzz" onPick={onPick} />
                </CommandList>
            </Command>
        </NextIntlClientProvider>,
    )

test("SearchResults : choisir un résultat le transmet", () => {
    const onPick = mock()
    renderResults({ kind: "results", results: [msft] }, onPick)

    fireEvent.click(screen.getByText("Microsoft"))

    expect(onPick).toHaveBeenCalledWith(msft)
})

test("SearchResults : message d'erreur et d'absence de résultat", () => {
    renderResults({ kind: "error" })
    expect(screen.getByText(fr.components.symbolSearch.failed)).toBeTruthy()
    cleanup()

    renderResults({ kind: "empty" })
    expect(screen.getByText(/zzz/)).toBeTruthy()
})
