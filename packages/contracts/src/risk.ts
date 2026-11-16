import { z } from "zod";
import { kafkaEventSchema } from "./event";

export const RISK_TOPICS = {
    completed: "risk.completed",
} as const;

// Risque d'un actif de l'allocation, dans l'ordre de l'allocation
export const assetRiskSchema = z.object({
    symbol: z.string().min(1),
    // Ratio 0..1 : poids cible, constant sur la période (D4)
    weight: z.number().gt(0).max(1),
    // Ratio annuel (0.2 = 20 %/an) : écart-type des rendements journaliers en EUR × √252, sur toute la période
    volatility: z.number().min(0),
    // Ratio 0..1 : part de la variance du portefeuille portée par l'actif ; la somme des actifs vaut 1
    riskContribution: z.number(),
});

export const riskSchema = z.object({
    // Nombre de jours de cotation communs à tous les actifs sur lesquels le risque est calculé (entier ≥ 250)
    commonDays: z.number().int().min(1),
    // Ratio annuel (0.15 = 15 %/an) : volatilité du portefeuille aux poids cibles, toute la période
    volatility: z.number().min(0),
    // Ratio ≤ 0 en pratique (−0.032 = −3,2 %) : VaR historique à 95 %, un jour
    var95: z.number(),
    // Ratio ≤ 0 en pratique : moyenne des pertes au-delà de la VaR, historique à 95 %, un jour
    cvar95: z.number(),
    assets: z.array(assetRiskSchema).min(1),
    // Matrice carrée de ratios de −1 à 1, lignes et colonnes dans l'ordre de `assets` ; diagonale 1
    correlations: z.array(z.array(z.number().min(-1).max(1))),
    // Ratio 0..1 : indice de Herfindahl Σ wᵢ² des poids (D7)
    hhi: z.number().gt(0).max(1),
    // Nombre d'actifs équivalents : 1 / hhi
    effectiveAssets: z.number().min(1),
    // Ratio 0..1 : plus grand poids de l'allocation
    maxWeight: z.number().gt(0).max(1),
});

export const riskCompletedPayloadSchema = z.object({
    executionId: z.string().min(1),
    finishedAt: z.iso.datetime(),
    // null sous 250 jours de cotation communs : « données insuffisantes », aucun résultat partiel (D6, D16)
    risk: riskSchema.nullable(),
});

export const riskCompletedEventSchema = kafkaEventSchema(riskCompletedPayloadSchema);

export type AssetRisk = z.infer<typeof assetRiskSchema>;
export type Risk = z.infer<typeof riskSchema>;
export type RiskCompletedPayload = z.infer<typeof riskCompletedPayloadSchema>;

// Seuil de drawdown maximal accepté (PUT /api/risk/:backtestId/constraint) : ratio positif au pourcent près (0.15 = 15 %),
// saisi en entier de 1 % à 99 % par l'utilisateur et converti par le web (D9)
export const RISK_LIMIT_BOUNDS = { min: 0.01, max: 0.99 } as const;

export const riskConstraintInputSchema = z.object({
    maxDrawdownLimit: z
        .number()
        .min(RISK_LIMIT_BOUNDS.min)
        .max(RISK_LIMIT_BOUNDS.max)
        .refine((limit) => Math.abs(limit * 100 - Math.round(limit * 100)) < 1e-6),
});

// État du risque d'un backtest : calculé, calculé sans résultat faute de données (D16), ou absent (D17 :
// ancien résultat, exécution en cours, en échec, ou `risk.completed` pas encore reçu)
export const RISK_STATES = ["COMPUTED", "INSUFFICIENT_DATA", "UNAVAILABLE"] as const;

// « Respectée » : |maxDrawdown| ≤ limite (égalité comprise) ; « Non respectée » sinon
export const RISK_CONSTRAINT_STATUSES = ["RESPECTED", "VIOLATED"] as const;

export type RiskState = (typeof RISK_STATES)[number];
export type RiskConstraintStatus = (typeof RISK_CONSTRAINT_STATUSES)[number];

// Vérification d'une limite de drawdown contre le drawdown maximal du résultat
export interface RiskConstraintCheck {
    // Ratio 0..1 : drawdown maximal accepté (0.15 = 15 %)
    limit: number;
    status: RiskConstraintStatus;
}

export interface RiskConstraint {
    // Ratio ≤ 0 : drawdown maximal du résultat (`maxDrawdown`), commun aux deux vérifications
    measured: number;
    // Dernière limite saisie
    current: RiskConstraintCheck;
    // Limite précédente ; null à la première vérification (D12)
    previous: RiskConstraintCheck | null;
}

// Phrases de lecture de la page (D14) : valeurs calculées ici, texte traduit par le web
export interface RiskReading {
    // Paire d'actifs la plus corrélée ; null avec un seul actif
    mostCorrelatedPair: { first: string; second: string; correlation: number } | null;
    // Actif qui porte la plus grande part de la variance (ratio 0..1)
    topContributor: { symbol: string; riskContribution: number };
}

// Réponse de GET /api/risk/:backtestId et de PUT /api/risk/:backtestId/constraint
export interface RiskView {
    state: RiskState;
    // Non null seulement si state = COMPUTED
    risk: Risk | null;
    reading: RiskReading | null;
    // Null sans limite saisie ou sans résultat terminé (le drawdown mesuré existe même sans risque : ancien résultat)
    constraint: RiskConstraint | null;
}
