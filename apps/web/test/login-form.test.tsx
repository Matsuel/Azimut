import { afterEach, expect, mock, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import fr from "../messages/fr.json"

const push = mock()
const refresh = mock()
mock.module("next/navigation", () => ({ useRouter: () => ({ push, refresh, replace: () => {} }) }))
// Client better-auth (frontière HTTP vers core-backend) : `login` simulé, `AuthError` réel conservé (module partagé par le process de test)
const { AuthError } = await import("../src/features/auth/api")
const login = mock(async () => {})
mock.module("../src/features/auth/api", () => ({ AuthError, login, register: async () => {} }))
const { LoginForm } = await import("../src/features/auth/login-form")

afterEach(() => {
    cleanup()
    login.mockClear()
    push.mockClear()
})

// Refus d'identifiants non testé ici : `onSubmit` laisse remonter le rejet de `mutateAsync` (TECH-DEBT, rejet non géré)
function respond() {
    login.mockImplementation(async () => {})
}

function renderForm() {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <NextIntlClientProvider locale="fr" messages={fr}>
                <LoginForm redirectTo="/app/backtest" />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    )
}

const fill = (email: string, password: string) => {
    fireEvent.change(screen.getByLabelText(fr.auth.fields.email), { target: { value: email } })
    fireEvent.change(screen.getByLabelText(fr.auth.fields.password), { target: { value: password } })
    fireEvent.click(screen.getByRole("button", { name: fr.auth.login.submit }))
}

test("saisie invalide : messages sous les champs, aucun appel à core-backend", async () => {
    respond()
    renderForm()

    fill("pas-un-email", "")

    expect(await screen.findByText(fr.auth.validation.invalidEmail)).toBeTruthy()
    expect(screen.getByText(fr.auth.validation.required)).toBeTruthy()
    expect(login).not.toHaveBeenCalled()
})

test("connexion réussie : ouvre la page demandée et relit la session", async () => {
    respond()
    renderForm()

    fill("ada@azimut.fr", "secret123")

    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/backtest"))
    expect(refresh).toHaveBeenCalled()
})
