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
    // Années depuis aujourd'hui (entier de 1 à `horizonYears`)
    years: z.number().int().min(1).max(PROJECTION_PARAMS.horizonYears),
    // Ratio 0..1 : part des chemins dont la valeur est sous le capital de départ à cet horizon
    lossProbability: z.number().min(0).max(1),
});

export const projectionSchema = z.object({
    // Graine du générateur aléatoire (entier)
    seed: z.number().int(),
    // Nombre de chemins simulés (entier)
    paths: z.number().int().min(1),
    // Longueur effective des blocs du rééchantillonnage, en jours (entier ≤ 21, raccourcie si l'historique est plus court, D12)
    blockDays: z.number().int().min(1).max(PROJECTION_PARAMS.blockDays),
    // EUR : capital de départ de la projection
    capital: z.number(),
    // Premier jour de cotation commun utilisé, YYYY-MM-DD
    historyStart: z.iso.date(),
    // Dernier jour de cotation commun utilisé, YYYY-MM-DD
    historyEnd: z.iso.date(),
    // Nombre de jours de cotation communs à tous les actifs (entier ≥ 2)
    historyDays: z.number().int().min(2),
    points: z.array(projectionPointSchema),
    years: z.array(projectionYearSchema),
});

export const projectionCompletedPayloadSchema = z.object({
    executionId: z.string().min(1),
    finishedAt: z.iso.datetime(),
    // Millisecondes (entier ≥ 0) : durée de `computeProjection`, mesurée par risk-engine
    durationMs: z.number().int().min(0),
    // null sous 2 jours de cotation communs ou si un actif n'a aucun cours : « données insuffisantes », aucun résultat partiel
    projection: projectionSchema.nullable(),
});

export const projectionCompletedEventSchema = kafkaEventSchema(projectionCompletedPayloadSchema);

export type ProjectionPoint = z.infer<typeof projectionPointSchema>;
export type ProjectionYear = z.infer<typeof projectionYearSchema>;
export type Projection = z.infer<typeof projectionSchema>;
export type ProjectionCompletedPayload = z.infer<typeof projectionCompletedPayloadSchema>;

// État de la projection d'un backtest : en cours de calcul (résultat créé, `projection.completed` pas encore reçu), calculée,
// calculée sans résultat faute de données (`projection.completed` reçu avec `projection: null`), ou absente (ancien résultat
// antérieur au calcul de projection, exécution en cours ou en échec)
export const PROJECTION_STATES = ["PENDING", "COMPUTED", "INSUFFICIENT_DATA", "UNAVAILABLE"] as const;

export type ProjectionState = (typeof PROJECTION_STATES)[number];

// Réponse de GET /api/projection/:backtestId
export interface ProjectionView {
    state: ProjectionState;
    // Non null seulement si state = COMPUTED
    projection: Projection | null;
    // Une entrée par exécution du backtest qui a un résultat ou est en cours, tentative décroissante
    history: ProjectionRun[];
}

// Calcul de la projection d'une exécution du backtest (ligne de l'historique des calculs)
export interface ProjectionRun {
    executionId: string;
    // Numéro de la tentative (entier ≥ 1)
    attempt: number;
    // Instant de réception de `projection.completed` (ISO 8601) ; null tant qu'il n'est pas reçu
    computedAt: string | null;
    // Millisecondes (entier ≥ 0) : durée du calcul mesurée par risk-engine ; null tant que non reçue et pour un résultat antérieur à son enregistrement
    durationMs: number | null;
    // PENDING : exécution en cours ou `projection.completed` attendu ; UNAVAILABLE : résultat antérieur au calcul de projection
    state: ProjectionState;
}
