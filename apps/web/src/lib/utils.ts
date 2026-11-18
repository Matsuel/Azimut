import { createCn } from "cn/config"

/** Tailles typographiques de `globals.css` (`--text-*`) : sans elles, `cn` les prend pour des couleurs et supprime `text-<couleur>`. */
const TEXT_SIZES = ["h1", "h2", "h3", "stat", "body", "body-medium", "body-semibold", "small", "small-medium"]

export const cn = createCn({ extend: { classGroups: { "font-size": [{ text: TEXT_SIZES }] } } })
