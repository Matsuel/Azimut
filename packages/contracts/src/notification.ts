import { z } from "zod";
import { EXECUTION_ERROR_CODES } from "./backtest";
import { kafkaEventSchema } from "./event";
import { type Paginated } from "./pagination";

export const NOTIFICATION_TOPICS = {
    requested: "notification.requested",
} as const;

export const NOTIFICATION_TYPES = [
    "BACKTEST_COMPLETED",
    "BACKTEST_FAILED",
    "RISK_CONSTRAINT_VIOLATED",
    "PROJECTION_COMPLETED",
] as const;

// Catégories d'onglet de la page Notifications
export const NOTIFICATION_CATEGORIES = ["BACKTESTS", "RISK"] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

// Catégorie de chaque type (D4) : le service la déduit du type, elle n'est jamais transmise
export const NOTIFICATION_CATEGORY_BY_TYPE: Record<NotificationType, NotificationCategory> = {
    BACKTEST_COMPLETED: "BACKTESTS",
    BACKTEST_FAILED: "BACKTESTS",
    PROJECTION_COMPLETED: "BACKTESTS",
    RISK_CONSTRAINT_VIOLATED: "RISK",
};

const backtestRef = {
    backtestId: z.string().min(1),
    // Nom du backtest au moment de la notification
    name: z.string().min(1),
};

// Paramètres par type : valeurs chiffrées seulement, le web rend le texte (D3)
export const backtestCompletedParamsSchema = z.object({
    ...backtestRef,
    // Ratio annuel (0.12 = 12 %/an) : rendement annualisé ; null sous deux points de valeur
    cagr: z.number().nullable(),
    // Sans unité : ratio de Sharpe
    sharpe: z.number().nullable(),
    // Ratio ≥ 0 (0.18 = 18 %) : drawdown maximal, en valeur absolue (le résultat le stocke négatif)
    maxDrawdown: z.number().min(0),
});

export const backtestFailedParamsSchema = z.object({
    ...backtestRef,
    errorCode: z.enum(EXECUTION_ERROR_CODES).nullable(),
});

export const riskConstraintViolatedParamsSchema = z.object({
    ...backtestRef,
    // Ratio ≥ 0 (0.18 = 18 %) : drawdown maximal mesuré
    maxDrawdown: z.number().min(0),
    // Ratio 0..1 (0.15 = 15 %) : limite de drawdown fixée par l'utilisateur
    limit: z.number().min(0).max(1),
});

export const projectionCompletedParamsSchema = z.object({
    ...backtestRef,
    // Entier ≥ 1 : nombre de scénarios simulés
    scenarios: z.number().int().min(1),
    // Ratio 0..1 : probabilité de perte à l'horizon final
    lossProbability: z.number().min(0).max(1),
});

const notificationBase = {
    userId: z.string().min(1),
    // Clé métier unique (D6) : `<type>:<executionId>` ou `<type>:<backtestId>:<limite>`
    dedupKey: z.string().min(1),
    // Date ISO 8601 de la transition qui a produit la notification
    occurredAt: z.iso.datetime(),
};

export const notificationRequestedPayloadSchema = z.discriminatedUnion("type", [
    z.object({ ...notificationBase, type: z.literal("BACKTEST_COMPLETED"), params: backtestCompletedParamsSchema }),
    z.object({ ...notificationBase, type: z.literal("BACKTEST_FAILED"), params: backtestFailedParamsSchema }),
    z.object({
        ...notificationBase,
        type: z.literal("RISK_CONSTRAINT_VIOLATED"),
        params: riskConstraintViolatedParamsSchema,
    }),
    z.object({ ...notificationBase, type: z.literal("PROJECTION_COMPLETED"), params: projectionCompletedParamsSchema }),
]);

export const notificationRequestedEventSchema = kafkaEventSchema(notificationRequestedPayloadSchema);

export type NotificationRequestedPayload = z.infer<typeof notificationRequestedPayloadSchema>;

// Notification renvoyée par l'API : même union type/params, plus l'état de lecture
export type NotificationView = NotificationRequestedPayload extends infer P
    ? P extends { type: infer T; params: infer Params }
        ? {
              id: string;
              type: T;
              category: NotificationCategory;
              params: Params;
              // Date ISO 8601
              createdAt: string;
              // Date ISO 8601 ; null tant que non lue
              readAt: string | null;
          }
        : never
    : never;

// Nombres des onglets, indépendants du filtre de la requête (entiers ≥ 0)
export interface NotificationCounts {
    all: number;
    unread: number;
    BACKTESTS: number;
    RISK: number;
}

export interface NotificationList extends Paginated<NotificationView> {
    counts: NotificationCounts;
    // Jours de conservation (D10) : le web l'affiche sans le coder en dur
    retentionDays: number;
}

export const notificationListQuerySchema = z.object({
    category: z.enum(NOTIFICATION_CATEGORIES).optional(),
    unread: z
        .enum(["true", "false"])
        .transform((v) => v === "true")
        .optional(),
});
