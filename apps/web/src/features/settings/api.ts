import { AuthError } from "@/features/auth/api"
import { apiFetch } from "@/lib/api"
import { authClient, updateUser } from "@/lib/auth"
import type { ProfileValues } from "./schema"
import type { NotificationPreferences, NotificationPreferencesUpdate } from "./types"

// better-auth (cookies de session) plutôt qu'apiFetch, comme features/auth ; l'erreur est relancée en `AuthError`.
// La session est relue sans le cache de cookie : sinon le rendu serveur garde l'ancien nom jusqu'à l'expiration du cache.
export async function updateProfile(values: ProfileValues): Promise<void> {
    const { error } = await updateUser({ name: values.name })
    if (error) throw new AuthError(error)
    await authClient.getSession({ query: { disableCookieCache: true } })
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
    return apiFetch<NotificationPreferences>("/notifications/preferences")
}

export async function updateNotificationPreferences(
    update: NotificationPreferencesUpdate,
): Promise<NotificationPreferences> {
    return apiFetch<NotificationPreferences>("/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
    })
}
