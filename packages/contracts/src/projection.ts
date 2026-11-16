import { z } from "zod";
import { kafkaEventSchema } from "./event";

export const PROJECTION_TOPICS = {
    completed: "projection.completed",
} as const;

// Paramètres fixes du tirage (D6′) ; `paths` chemins, blocs de `blockDays` jours ouvrés, `horizonYears` ans, graine `seed`
export const PROJECTION_PARAMS = { paths: 10_000, blockDays: 21, horizonYears: 10, seed: 42 } as const;

// Horizons proposés à l'affichage, en années
export const PROJECTION_HORIZONS = [1, 3, 5, 10] as const;

// Percentiles de la valeur du portefeuille à un jour donné de la projection
export const projectionPointSchema = z.object({
    // Jours ouvrés depuis aujourd'hui (entier ≥ 0)
    day: z.number().int().min(0),
    // EUR : percentiles 5, 10, 25, 50, 75, 90 et 95 de la valeur du portefeuille ce jour-là
    p5: z.number(),
    p10: z.number(),
    p25: z.number(),
    p50: z.number(),
    p75: z.number(),
    p90: z.number(),
    p95: z.number(),
});

// Point d'une fin d'année de la projection, avec la probabilité de perte
export const projectionYearSchema = projectionPointSchema.extend({
    // Années depuis aujourd'hui (entier de 1 à 10)
    years: z.number().int().min(1).max(10),
    // Ratio 0..1 : part des chemins dont la valeur est sous le capital de départ à cet horizon
    lossProbability: z.number().min(0).max(1),
});

export const projectionSchema = z.object({
    // Graine du générateur aléatoire (entier)
    seed: z.number().int(),
    // Nombre de chemins simulés (entier)
    paths: z.number().int().min(1),
    // Jours ouvrés par bloc du rééchantillonnage (entier)
    blockDays: z.number().int().min(1),
    // EUR : capital de départ de la projection
    capital: z.number(),
    // Premier jour de cotation commun utilisé, YYYY-MM-DD
    historyStart: z.iso.date(),
    // Dernier jour de cotation commun utilisé, YYYY-MM-DD
    historyEnd: z.iso.date(),
    // Nombre de jours de cotation communs à tous les actifs (entier ≥ 250)
    historyDays: z.number().int().min(1),
    points: z.array(projectionPointSchema),
    years: z.array(projectionYearSchema),
});

export const projectionCompletedPayloadSchema = z.object({
    executionId: z.string().min(1),
    finishedAt: z.iso.datetime(),
    // null sous 250 jours de cotation communs : « données insuffisantes », aucun résultat partiel
    projection: projectionSchema.nullable(),
});

export const projectionCompletedEventSchema = kafkaEventSchema(projectionCompletedPayloadSchema);

export type ProjectionPoint = z.infer<typeof projectionPointSchema>;
export type ProjectionYear = z.infer<typeof projectionYearSchema>;
export type Projection = z.infer<typeof projectionSchema>;
export type ProjectionCompletedPayload = z.infer<typeof projectionCompletedPayloadSchema>;

// État de la projection d'un backtest : calculée, calculée sans résultat faute de données (`projection.completed`
// reçu avec `projection: null`), ou absente (ancien résultat, exécution en cours ou en échec, aucun événement reçu)
export const PROJECTION_STATES = ["COMPUTED", "INSUFFICIENT_DATA", "UNAVAILABLE"] as const;

export type ProjectionState = (typeof PROJECTION_STATES)[number];

// Réponse de GET /api/projection/:backtestId
export interface ProjectionView {
    state: ProjectionState;
    // Non null seulement si state = COMPUTED
    projection: Projection | null;
}
