import "server-only"
import { hasAdminRole } from "@azimut/utils/roles"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"
import { authClient } from "./auth"
import { routes } from "./routes"

/** Session de la requête courante (cookies transmis à core-backend), `null` sans session ; un appel par rendu. */
export const getSession = cache(async () => {
    const cookie = (await headers()).get("cookie") ?? ""
    const { data } = await authClient.getSession({
        fetchOptions: { headers: { cookie } },
    })
    return data // { session, user } ou null
})

/** Session courante, ou redirection vers la connexion. */
export async function requireSession() {
    const session = await getSession()
    if (!session) redirect(routes.login)
    return session
}

export async function isAdmin(): Promise<boolean> {
    const session = await getSession()
    return hasAdminRole(session?.user.role)
}
