import { expect, test } from "bun:test"
import { createTranslator } from "next-intl"
import fr from "../messages/fr.json"
import { createLoginSchema, createRegisterSchema } from "../src/features/auth/schema"

const t = createTranslator({ locale: "fr", messages: fr, namespace: "auth.validation" }) as never
const messages = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
    Object.fromEntries((result.error?.issues ?? []).map(({ path, message }) => [path.join("."), message]))

test("connexion : email valide et mot de passe non vide, messages traduits", () => {
    expect(createLoginSchema(t).safeParse({ email: "a@b.fr", password: "x" }).success).toBe(true)
    expect(messages(createLoginSchema(t).safeParse({ email: "pas-un-email", password: "" }))).toEqual({
        email: "Email invalide",
        password: "Requis",
    })
})

test("inscription : nom non vide après trim, mot de passe de 8 à 128 caractères", () => {
    const schema = createRegisterSchema(t)

    expect(schema.safeParse({ name: "Ada", email: "a@b.fr", password: "12345678" }).success).toBe(true)
    expect(messages(schema.safeParse({ name: "  ", email: "a@b.fr", password: "1234567" }))).toEqual({
        name: "Requis",
        password: "Au moins 8 caractères",
    })
    expect(messages(schema.safeParse({ name: "Ada", email: "a@b.fr", password: "x".repeat(129) }))).toEqual({
        password: "Au plus 128 caractères",
    })
})
