import { afterEach, expect, test } from "bun:test"
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { FormProvider, useForm } from "react-hook-form"
import fr from "../messages/fr.json"
import { CheckboxField, SwitchField, TextareaField, TextField } from "../src/components/form/fields"

afterEach(cleanup)

type Values = { email: string; notes: string; accept: boolean; notify: boolean }
// Formulaire créé hors du rendu : les assertions lisent ses valeurs
function renderFields() {
    const form = renderHook(() =>
        useForm<Values>({ defaultValues: { email: "", notes: "", accept: false, notify: true } }),
    ).result.current
    render(
        <NextIntlClientProvider locale="fr" messages={fr}>
            <FormProvider {...form}>
                <TextField<Values> name="email" type="email" label="Email" description="Adresse de connexion" />
                <TextareaField<Values> name="notes" label="Notes" />
                <CheckboxField<Values> name="accept" label="J'accepte" />
                <SwitchField<Values> name="notify" label="Notifier" />
            </FormProvider>
        </NextIntlClientProvider>,
    )
    return form
}

test("un champ texte est relié à son libellé et écrit sa valeur dans le formulaire", () => {
    const form = renderFields()

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.fr" } })
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "60/40" } })

    expect(screen.getByLabelText("Email")).toHaveProperty("type", "email")
    expect(form.getValues()).toMatchObject({ email: "a@b.fr", notes: "60/40" })
    expect(screen.getByText("Adresse de connexion")).toBeTruthy()
})

test("une erreur du formulaire s'affiche sous le champ et le marque invalide", () => {
    const form = renderFields()

    act(() => form.setError("email", { message: "Email invalide" }))

    expect(screen.getByText("Email invalide")).toBeTruthy()
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true")
})

test("case à cocher et interrupteur basculent leur valeur booléenne", () => {
    const form = renderFields()

    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("switch"))

    expect(form.getValues()).toMatchObject({ accept: true, notify: false })
})
