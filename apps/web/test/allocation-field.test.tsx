import { afterEach, expect, spyOn, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { FormProvider, type UseFormReturn, useForm } from "react-hook-form"
import fr from "../messages/fr.json"
import { AllocationField } from "../src/features/backtest/form/allocation-field"
import type { AllocationInput } from "../src/features/backtest/types"

type Values = { allocations: AllocationInput[] }
// Formulaire du rendu courant, lu par les assertions
const harness = {} as { form: UseFormReturn<Values> }
let fetchSpy: ReturnType<typeof spyOn> | undefined

afterEach(() => {
    cleanup()
    fetchSpy?.mockRestore()
})

function renderField(allocations: AllocationInput[]) {
    function Harness() {
        const form = useForm<Values>({ defaultValues: { allocations } })
        harness.form = form
        return (
            <FormProvider {...form}>
                <AllocationField<Values> name="allocations" label="Allocation" />
            </FormProvider>
        )
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="fr" messages={fr}>
                <Harness />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    )
}

const total = () => screen.getByText(/Total/).textContent

test("modifier un poids met à jour la ligne et le total affiché", () => {
    renderField([
        { symbol: "AAPL", weight: 60 },
        { symbol: "MSFT", weight: 30 },
    ])
    expect(total()).toContain("90")

    fireEvent.change(screen.getByLabelText("MSFT"), { target: { value: "40" } })

    expect(harness.form.getValues("allocations")).toEqual([
        { symbol: "AAPL", weight: 60 },
        { symbol: "MSFT", weight: 40 },
    ])
    expect(total()).toContain("100")
})

test("retirer un actif l'enlève de l'allocation", () => {
    renderField([
        { symbol: "AAPL", weight: 60 },
        { symbol: "MSFT", weight: 40 },
    ])

    fireEvent.click(screen.getByRole("button", { name: fr.backtest.allocation.remove.replace("{symbol}", "AAPL") }))

    expect(harness.form.getValues("allocations")).toEqual([{ symbol: "MSFT", weight: 40 }])
})

test("ajouter un actif depuis la recherche lui donne le reste jusqu'à 100 %, sans proposer ceux déjà choisis", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json([
            { symbol: "AAPL", name: "Apple", exchange: "NMS", assetType: "EQUITY" },
            { symbol: "GLD", name: "SPDR Gold", exchange: "PCX", assetType: "ETF" },
        ]),
    )
    renderField([{ symbol: "AAPL", weight: 70 }])

    fireEvent.click(screen.getByRole("button", { name: fr.backtest.allocation.add }))
    fireEvent.change(await screen.findByRole("combobox"), { target: { value: "gold" } })
    const gold = await screen.findByText("SPDR Gold", undefined, { timeout: 2000 })
    expect(screen.queryByText("Apple")).toBeNull()
    fireEvent.click(gold)

    await waitFor(() =>
        expect(harness.form.getValues("allocations")).toEqual([
            { symbol: "AAPL", weight: 70 },
            { symbol: "GLD", name: "SPDR Gold", weight: 30 },
        ]),
    )
})
