// Rôle administrateur du plugin `admin()` de better-auth
export const ADMIN_ROLE = "admin";

/**
 * Vrai si `role` contient le rôle administrateur. better-auth stocke `user.role` comme une liste séparée par des virgules
 * (`"user, admin"`) ; `null` ou absent → faux. Seule lecture du rôle, partagée par core-backend (`requireAdmin`) et le web
 * (sidebar, garde des pages admin) : sans fichier `index.ts` intermédiaire côté web pour ne pas embarquer `Logger`.
 */
export const hasAdminRole = (role?: string | null): boolean =>
    role?.split(",").some((item) => item.trim() === ADMIN_ROLE) ?? false;
