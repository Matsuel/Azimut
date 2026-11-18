import { test as setup } from "@playwright/test"
import { AUTH_FILE, signUp } from "./helpers"

// Un compte pour tous les parcours connectés : inscrit par l'API, sa session (cookie) est réutilisée par chaque test
setup("compte de test connecté", async ({ request }) => {
    await signUp(request)
    await request.storageState({ path: AUTH_FILE })
})
