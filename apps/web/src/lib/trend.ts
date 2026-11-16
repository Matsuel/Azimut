export type Trend = "up" | "down" | "neutral"

/**
 * Sens d'une variation pour la colorer : `up` si elle est favorable (hausse, ou baisse quand `higherIsBetter` est faux),
 * `down` sinon, `neutral` à zéro.
 */
export const trendOf = (change: number, higherIsBetter = true): Trend =>
    change === 0 ? "neutral" : change > 0 === higherIsBetter ? "up" : "down"

/** Sens d'une variation, pour la flèche d'un badge : `none` à zéro. Indépendant de sa couleur (`toneOf`). */
export type Direction = "up" | "down" | "none"

/** Ton d'une variation, pour la couleur d'un badge : `positive` si elle est favorable, `negative` sinon. */
export type Tone = "positive" | "negative" | "neutral"

/** Flèche d'une variation : `up` si elle est positive, `down` si elle est négative, `none` à zéro. */
export const directionOf = (change: number): Direction => (change === 0 ? "none" : change > 0 ? "up" : "down")

const toneByTrend = { up: "positive", down: "negative", neutral: "neutral" } as const satisfies Record<Trend, Tone>

/** Ton d'une variation selon `trendOf` : une volatilité qui baisse (`higherIsBetter` faux) est `positive` avec une flèche `down`. */
export const toneOf = (change: number, higherIsBetter = true): Tone => toneByTrend[trendOf(change, higherIsBetter)]

/** Rendu d'une tendance : couleur CSS (courbes), classe de texte, variant de `Badge`. */
export const trendStyles = {
    up: { color: "var(--success)", text: "text-success", badge: "success" },
    down: { color: "var(--destructive)", text: "text-destructive", badge: "destructive" },
    neutral: { color: "var(--muted-foreground)", text: "", badge: "outline" },
} as const satisfies Record<Trend, { color: string; text: string; badge: "success" | "destructive" | "outline" }>
