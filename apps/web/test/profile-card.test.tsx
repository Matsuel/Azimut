import { afterEach, expect, mock, spyOn, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { toast } from "sonner"
import fr from "../messages/fr.json"

const refresh = mock()
mock.module("next/navigation", () => ({ useRouter: () => ({ refresh, push: () => {} }) }))
const toastSuccess = spyOn(toast, "success").mockImplementation(() => 1)
// Client better-auth (frontière HTTP vers core-backend) : `updateProfile` simulé, `AuthError` réel conservé
const { AuthError } = await import("../src/features/auth/api")
const updateProfile = mock<(values: { name: string }) => Promise<void>>(async () => {})
mock.module("../src/features/settings/api", () => ({
    updateProfile,
    resetAccountData: async () => {},
    getNotificationPreferences: async () => ({ BACKTESTS: true, RISK: true }),
    updateNotificationPreferences: async () => ({ BACKTESTS: true, RISK: true }),
}))
const { ProfileCard } = await import("../src/features/settings/profile-card")
const { SettingsTabs } = await import("../src/features/settings/settings-tabs")
const { initials } = await import("../src/features/settings/utils")

const user = { name: "Jean Dupont", email: "jean@azimut.fr" }

afterEach(() => {
    cleanup()
    updateProfile.mockReset()
    updateProfile.mockImplementation(async () => {})
    refresh.mockClear()
    toastSuccess.mockClear()
})

function inFrench(node: React.ReactNode) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <NextIntlClientProvider locale="fr" messages={fr}>
                {node}
            </NextIntlClientProvider>
        </QueryClientProvider>,
    )
}

const nameInput = () => screen.getByLabelText(fr.settings.profile.name) as HTMLInputElement
const save = () => screen.getByRole("button", { name: fr.settings.profile.save }) as HTMLButtonElement
const type = (value: string) => fireEvent.change(nameInput(), { target: { value } })

test("e-mail en lecture seule, Enregistrer désactivé sans changement", () => {
    inFrench(<ProfileCard user={user} />)

    expect(nameInput().value).toBe("Jean Dupont")
    expect((screen.getByLabelText(fr.settings.profile.email) as HTMLInputElement).disabled).toBe(true)
    expect(save().disabled).toBe(true)

    type("Jean D.")
    return waitFor(() => expect(save().disabled).toBe(false))
})

test("nom vide ou de plus de 100 caractères : message, aucun appel", async () => {
    inFrench(<ProfileCard user={user} />)

    type("   ")
    fireEvent.click(save())
    expect(await screen.findByText(fr.settings.profile.validation.nameRequired)).toBeTruthy()

    type("x".repeat(101))
    fireEvent.click(save())
    expect(await screen.findByText("Le nom ne peut pas dépasser 100 caractères.")).toBeTruthy()
    expect(updateProfile).not.toHaveBeenCalled()
})

test("enregistrement : appel avec le nom, toast, page relue", async () => {
    inFrench(<ProfileCard user={user} />)

    type("  Jean D.  ")
    fireEvent.click(save())

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(fr.settings.profile.saved))
    expect(updateProfile.mock.calls[0]?.[0]).toEqual({ name: "Jean D." })
    expect(refresh).toHaveBeenCalled()
})

test("erreur serveur : message affiché, saisie conservée, pas de toast", async () => {
    updateProfile.mockImplementation(async () => {
        throw new AuthError({ code: "AUTRE", message: "boom" })
    })
    inFrench(<ProfileCard user={user} />)

    type("Jean D.")
    fireEvent.click(save())

    expect(await screen.findByText(fr.settings.profile.failed)).toBeTruthy()
    expect(nameInput().value).toBe("Jean D.")
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
})

test("onglets : Profil actif par défaut, Portefeuille réellement désactivé", () => {
    inFrench(<SettingsTabs user={user} />)

    const tab = (name: string) => screen.getByRole("tab", { name }) as HTMLButtonElement
    expect(tab(fr.settings.tabs.profile).getAttribute("aria-selected")).toBe("true")
    expect(tab(fr.settings.tabs.wallet).getAttribute("aria-disabled")).toBe("true")
    expect(tab(fr.settings.tabs.appearance)).toBeTruthy()
})

test("initiales : deux premiers mots en majuscules", () => {
    expect(initials("jean dupont")).toBe("JD")
    expect(initials("  Ada ")).toBe("A")
    expect(initials("a b c")).toBe("AB")
})
