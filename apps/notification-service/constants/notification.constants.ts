// Groupe de consommateurs propre : le service lit `notification.requested` indépendamment des autres services
export const NOTIFICATION_CONSUMER_GROUP = "notification-service";

// Groupe propre à `user.data.reset` : indépendant du groupe de `notification.requested` (un handler par consumer)
export const ACCOUNT_CONSUMER_GROUP = "notification-service-account";

// Durée de conservation d'une notification, en jours entiers (D10) ; exposée au web dans `retentionDays` de la liste
export const NOTIFICATION_RETENTION_DAYS = 90;

// Battement du flux SSE (ms) : garde la connexion ouverte à travers les proxys et détecte un client disparu
export const NOTIFICATION_HEARTBEAT_MS = 25_000;

// Fréquence de la purge des notifications expirées (ms) : une fois par heure
export const NOTIFICATION_PURGE_INTERVAL_MS = 3_600_000;
