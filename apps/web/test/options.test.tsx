import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createTranslator, NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import fr from "../messages/fr.json"
import type { OptionInputs, PricingInput, PricingView, RateCurve } from "../src/features/pricing/types"

const getRateCurve = mock<() => Promise<RateCurve>>()
const createPricing = mock<(input: PricingInput) => Promise<PricingView>>()
const getPricing = mock<(id: string) => Promise<PricingView>>()
const getOptionInputs = mock<(symbol: string) => Promise<OptionInputs>>()
mock.module("../src/features/pricing/api", () => ({ getRateCurve, createPricing, getPricing, getOptionInputs }))

const { OptionsPage } = await import("../src/features/pricing/options-page")
const { createOptionSchema } = await import("../src/features/pricing/schema")
const { optionDefaults, toOptionPricingInput } = await import("../src/features/pricing/utils")

afterEach(cleanup)
beforeEach(() => {
    for (const fn of [getRateCurve, createPricing, getPricing, getOptionInputs]) fn.mockReset()
    getRateCurve.mockResolvedValue(curve)
    getOptionInputs.mockResolvedValue(inputs)
})

const curve: RateCurve = {
    currency: "USD",
    points: [
        { symbol: "^IRX", maturityYears: 0.25, rate: 0.0432, date: "2026-10-28" },
        { symbol: "^TYX", maturityYears: 30, rate: 0.0456, date: "2026-10-28" },
    ],
}
const inputs: OptionInputs = { symbol: "AAPL", currency: "USD", spot: 224.4, dividendYield: 0.005, volatility: 0.243 }

const request: PricingInput = {
    kind: "OPTION",
    option: {
        spot: 224.4,
        strike: 224,
        maturityYears: 182 / 365,
        rate: 0.0432,
        dividendYield: 0.005,
        volatility: 0.243,
    },
}
const side = (price: number, breakEven: number) => ({ price, intrinsicValue: 0, timeValue: price, breakEven })
const grid = [180, 230, 280].map((spot) => ({
    spot,
    callPayoff: Math.max(spot - 224, 0),
    putPayoff: Math.max(224 - spot, 0),
    callNet: Math.max(spot - 224, 0) - 14.59,
    putNet: Math.max(224 - spot, 0) - 16.2,
}))
const view = (status: PricingView["status"], extra: Partial<PricingView> = {}): PricingView => ({
    id: "p1",
    kind: "OPTION",
    status,
    input: request,
    result: null,
    error: null,
    createdAt: "2026-11-23T10:00:00.000Z",
    ...extra,
})
const completed = view("COMPLETED", {
    result: {
        kind: "OPTION",
        option: {
            call: side(14.59, 238.59),
            put: side(16.2, 207.8),
            callMinusPut: -1.61,
            parityRight: -1.61,
            parityGap: 0,
            parityVerified: true,
            payoffGrid: grid,
        },
    },
})

const inFrench = (node: ReactNode) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="fr" messages={fr}>
                {node}
            </NextIntlClientProvider>
        </QueryClientProvider>,
    )
}
// Le libellé de la volatilité porte une aide (`InfoHint`) : le champ se retrouve par son rôle et le début de son nom
const field = (name: string) =>
    screen.getByRole("spinbutton", { name: new RegExp(`^${name.replace(/[()]/g, "\\$&")}`) }) as HTMLInputElement

test("la saisie devient une demande : pourcentages en ratios, jours en années de 365 jours", () => {
    expect(
        toOptionPricingInput({
            spot: 224.4,
            strike: 224,
            maturityDays: 182,
            rate: 4.32,
            dividendYield: 0.5,
            volatility: 24.3,
        }),
    ).toEqual(request)
})

test("le préremplissage vient du symbole et de ^IRX ; un champ sans source reste vide", () => {
    expect(optionDefaults(inputs, curve)).toEqual({
        spot: 224.4,
        strike: 224,
        maturityDays: 182,
        rate: 4.32,
        dividendYield: 0.5,
        volatility: 24.3,
    })
    expect(optionDefaults({ ...inputs, volatility: null }, undefined)).toMatchObject({
        volatility: undefined,
        rate: undefined,
    })
    expect(optionDefaults(undefined, curve)).toMatchObject({ spot: undefined, strike: undefined, rate: 4.32 })
})

test("le schéma refuse un spot, un strike, une maturité ou une volatilité nuls", () => {
    const t = createTranslator({ locale: "fr", messages: fr, namespace: "pages.options" })
    const schema = createOptionSchema(t as never)
    const valid = { spot: 100, strike: 100, maturityDays: 182, rate: 4, dividendYield: 0, volatility: 20 }

    expect(schema.safeParse(valid).success).toBe(true)
    for (const bad of [{ spot: 0 }, { strike: -1 }, { maturityDays: 0 }, { maturityDays: 1.5 }, { volatility: 0 }])
        expect(schema.safeParse({ ...valid, ...bad }).success).toBe(false)
})

test("depuis la fiche d'un symbole, le formulaire est prérempli et modifiable", async () => {
    inFrench(<OptionsPage symbol="AAPL" />)

    await screen.findByText("Calculateur d’option · AAPL")
    await waitFor(() => expect(field("Spot").value).toBe("224.4"))
    expect(field("Strike").value).toBe("224")
    expect(field("Taux sans risque (%)").value).toBe("4.32")
    expect(field("Dividende continu q (%)").value).toBe("0.5")
    expect(field("Volatilité (%)").value).toBe("24.3")
    expect(getOptionInputs).toHaveBeenCalledWith("AAPL")
})

test("préremplissage en échec : champs vides, message et saisie manuelle possible", async () => {
    getOptionInputs.mockRejectedValue(new Error("boom"))
    inFrench(<OptionsPage symbol="ZZZZ" />)

    expect(await screen.findByText(/Les valeurs de ZZZZ n’ont pas pu être préremplies/)).toBeTruthy()
    expect(field("Spot").value).toBe("")
    expect(field("Taux sans risque (%)").value).toBe("4.32")
})

test("calculer envoie la saisie puis affiche prix, parité et points morts reçus, sans les recalculer", async () => {
    createPricing.mockResolvedValue(view("PENDING"))
    getPricing.mockResolvedValue(completed)
    inFrench(<OptionsPage symbol="AAPL" />)
    await waitFor(() => expect(field("Spot").value).toBe("224.4"))

    fireEvent.click(screen.getByRole("button", { name: "Calculer" }))

    await waitFor(() => expect(createPricing).toHaveBeenCalledTimes(1))
    expect(createPricing.mock.calls[0]![0]).toEqual(request)
    expect((await screen.findAllByText(/14,59/, { selector: "span" })).length).toBeGreaterThan(0)
    expect(screen.getByText("Vérifiée")).toBeTruthy()
    expect(screen.getByText("écart 0,000000")).toBeTruthy()
    // Volatilité inchangée depuis le préremplissage : annoncée comme historique
    expect(screen.getByText("historique")).toBeTruthy()
    expect(screen.getByText(/Points morts : .*238,59.* pour le call, .*207,80.* pour le put/)).toBeTruthy()
    expect(screen.getAllByRole("row").length).toBeGreaterThan(grid.length)
})

test("une volatilité modifiée est annoncée « saisie »", async () => {
    createPricing.mockResolvedValue(view("PENDING"))
    getPricing.mockResolvedValue(completed)
    inFrench(<OptionsPage symbol="AAPL" />)
    await waitFor(() => expect(field("Spot").value).toBe("224.4"))

    fireEvent.change(field("Volatilité (%)"), { target: { value: "30" } })
    fireEvent.click(screen.getByRole("button", { name: "Calculer" }))

    expect(await screen.findByText("saisie")).toBeTruthy()
})

test("une saisie invalide est refusée avant tout envoi", async () => {
    inFrench(<OptionsPage symbol={null} />)

    await waitFor(() => expect(field("Taux sans risque (%)").value).toBe("4.32"))
    fireEvent.click(screen.getByRole("button", { name: "Calculer" }))

    expect(await screen.findByText("Le spot doit être supérieur à 0.")).toBeTruthy()
    expect(createPricing).not.toHaveBeenCalled()
})

test("un calcul en échec affiche sa cause, le formulaire reste intact", async () => {
    createPricing.mockResolvedValue(view("PENDING"))
    getPricing.mockResolvedValue(view("FAILED", { error: "Option parameters out of numeric range" }))
    inFrench(<OptionsPage symbol="AAPL" />)
    await waitFor(() => expect(field("Spot").value).toBe("224.4"))

    fireEvent.click(screen.getByRole("button", { name: "Calculer" }))

    expect(await screen.findByText(/out of numeric range/)).toBeTruthy()
    expect(field("Spot").value).toBe("224.4")
})

test("une parité non vérifiée est annoncée comme un écart, pas comme vérifiée", async () => {
    const option = (completed.result as { option: object }).option
    const gap = {
        ...completed,
        result: { kind: "OPTION", option: { ...option, parityGap: 0.01, parityVerified: false } },
    }
    createPricing.mockResolvedValue(view("PENDING"))
    getPricing.mockResolvedValue(gap as PricingView)
    inFrench(<OptionsPage symbol="AAPL" />)
    await waitFor(() => expect(field("Spot").value).toBe("224.4"))

    fireEvent.click(screen.getByRole("button", { name: "Calculer" }))

    expect(await screen.findByText("écart 0,010000")).toBeTruthy()
    expect(screen.queryByText("Vérifiée")).toBeNull()
    expect(screen.getByText("0,010000 · écart")).toBeTruthy()
})

test("Réinitialiser efface le résultat, remet l'état vide et les valeurs préremplies", async () => {
    createPricing.mockResolvedValue(view("PENDING"))
    getPricing.mockResolvedValue(completed)
    inFrench(<OptionsPage symbol="AAPL" />)
    await waitFor(() => expect(field("Spot").value).toBe("224.4"))

    fireEvent.change(field("Strike"), { target: { value: "300" } })
    fireEvent.click(screen.getByRole("button", { name: "Calculer" }))
    await screen.findByText("Vérifiée")

    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }))

    expect(await screen.findByText("Saisissez les paramètres d’une option, puis calculez son prix.")).toBeTruthy()
    expect(screen.queryByText("Vérifiée")).toBeNull()
    expect(field("Strike").value).toBe("224")
    expect(field("Spot").value).toBe("224.4")
})

test("le strike de départ reste strictement positif pour un spot sous 0,5", () => {
    expect(optionDefaults({ ...inputs, spot: 0.3 }, curve).strike).toBe(0.3)
})
