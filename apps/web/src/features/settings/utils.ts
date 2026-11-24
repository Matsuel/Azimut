/** Initiales de l'avatar : première lettre des deux premiers mots du nom, en majuscules (`"jean dupont"` → `"JD"`). */
export function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("")
}
