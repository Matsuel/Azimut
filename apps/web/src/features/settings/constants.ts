import type { NotificationCategory } from "./types"

// Longueur maximale du nom de profil, en caractères (règle de la maquette 06)
export const NAME_MAX_LENGTH = 100

// Catégories réglables, dans l'ordre d'affichage de la maquette 06.1 ; libellés `settings.notifications.categories.<clé>`
export const PREFERENCE_CATEGORIES = ["BACKTESTS", "RISK"] as const satisfies readonly NotificationCategory[]
