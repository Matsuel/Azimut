import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { toast } from "sonner"
import fr from "../messages/fr.json"
import { ApiError } from "../src/lib/api"

const resetAccountData = mock<() => Promise<void>>()
mock.module("../src/features/settings/api", () => ({
    resetAccountData,
    updateProfile: async () => {},
    getNotificationPreferences: async () => ({ BACKTESTS: true, RISK: true }),
    updateNotificationPreferences: async () => ({ BACKTESTS: true, RISK: true }),
}))
const { ResetDataCard } = await import("../src/features/settings/reset-data-card")
const toastSuccess = mock(() => "")
toast.success = toastSuccess

const word = fr.settings.reset.dialog.confirmWord
let queryClient: QueryClient

beforeEach(() => {
    resetAccountData.mockReset()
    toastSuccess.mockClear()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(cleanup)

function openDialog() {
    render(
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="fr" messages={fr}>
                <ResetDataCard />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole("button", { name: fr.settings.reset.button }))
}

const confirmButton = () => screen.getByRole("button", { name: fr.settings.reset.dialog.confirm }) as HTMLButtonElement
const typeWord = (value: string) =>
    fireEvent.change(screen.getByLabelText(`Saisissez ${word} pour confirmer`), { target: { value } })

test("la carte ouvre le dialog avec le récapitulatif des familles supprimées", async () => {
    openDialog()

    expect(await screen.findByText(fr.settings.reset.dialog.title)).toBeTruthy()
    expect(screen.getByText(fr.settings.reset.dialog.families.backtests)).toBeTruthy()
    expect(screen.getAllByText(fr.settings.reset.dialog.deleted)).toHaveLength(4)
})

test("confirmation désactivée tant que la saisie n'est pas exactement le mot", async () => {
    openDialog()
    await screen.findByText(fr.settings.reset.dialog.title)

    expect(confirmButton().disabled).toBe(true)
    typeWord("réinitialiser")
    expect(confirmButton().disabled).toBe(true)
    typeWord(word)
    expect(confirmButton().disabled).toBe(false)
    expect(resetAccountData).not.toHaveBeenCalled()
})

test("succès : appel de l'API, caches invalidés, dialog fermé, toast", async () => {
    resetAccountData.mockResolvedValue(undefined)
    const invalidate = mock(async () => {})
    queryClient.invalidateQueries = invalidate as never
    openDialog()
    await screen.findByText(fr.settings.reset.dialog.title)

    typeWord(word)
    fireEvent.click(confirmButton())

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(fr.settings.reset.dialog.done))
    expect(resetAccountData).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith() // sans filtre : tous les caches
    // La fermeture passe par l'animation de sortie de la boîte
    await waitFor(() => expect(screen.queryByText(fr.settings.reset.dialog.title)).toBeNull(), { timeout: 4000 })
}, 10_000)

test("échec : message d'erreur, dialog ouvert, pas de toast", async () => {
    resetAccountData.mockRejectedValue(new ApiError(503, "Unavailable", { code: "SERVICE_UNAVAILABLE" }))
    openDialog()
    await screen.findByText(fr.settings.reset.dialog.title)

    typeWord(word)
    fireEvent.click(confirmButton())

    expect(await screen.findByText(fr.errors.SERVICE_UNAVAILABLE)).toBeTruthy()
    expect(screen.getByText(fr.settings.reset.dialog.title)).toBeTruthy()
    expect(toastSuccess).not.toHaveBeenCalled()
})
