import { AuthError } from "@/features/auth/api"
import { authClient, updateUser } from "@/lib/auth"
import type { ProfileValues } from "./schema"

// better-auth (cookies de session) plutôt qu'apiFetch, comme features/auth ; l'erreur est relancée en `AuthError`.
// La session est relue sans le cache de cookie : sinon le rendu serveur garde l'ancien nom jusqu'à l'expiration du cache.
export async function updateProfile(values: ProfileValues): Promise<void> {
    const { error } = await updateUser({ name: values.name })
    if (error) throw new AuthError(error)
    await authClient.getSession({ query: { disableCookieCache: true } })
}
