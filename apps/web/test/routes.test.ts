import { expect, test } from "bun:test"
import { getPageItems, paginate } from "../src/lib/pagination"
import { routes, safeRedirect } from "../src/lib/routes"

test.each([
    ["/app/backtest/b1", "/app/backtest/b1"],
    [undefined, "/app"],
    ["https://evil.example/app", "/app"],
    ["//evil.example/app", "/app"],
    ["/login", "/app"],
])("safeRedirect(%p) : page interne de l'app, sinon le dashboard", (redirect, expected) => {
    expect(safeRedirect(redirect)).toBe(expected)
})

test("les chemins à paramètre encodent le symbole et l'identifiant du backtest", () => {
    expect(routes.symbol("BRK/B")).toBe("/app/market/BRK%2FB")
    expect(routes.backtestRisk("a b")).toBe("/app/risk?backtest=a%20b")
    expect(routes.compareIds("a", "b")).toBe("/app/backtest/compare?ids=a,b")
})

test.each([
    [1, 5, [1, 2, 3, 4, 5]],
    [2, 10, [1, 2, 3, 4, 5, "ellipsis", 10]],
    [9, 10, [1, "ellipsis", 6, 7, 8, 9, 10]],
    [5, 10, [1, "ellipsis", 4, 5, 6, "ellipsis", 10]],
])("getPageItems(page %i sur %i) : première, dernière, voisines et trous", (page, count, expected) => {
    expect(getPageItems(page, count)).toEqual(expected as (number | "ellipsis")[])
})

test("paginate découpe la page demandée, vide au-delà de la fin", () => {
    const items = [1, 2, 3, 4, 5]

    expect(paginate(items, 2, 2)).toEqual([3, 4])
    expect(paginate(items, 4, 2)).toEqual([])
})
