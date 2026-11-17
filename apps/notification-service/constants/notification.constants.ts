// Groupe de consommateurs propre : le service lit `notification.requested` indépendamment des autres services
export const NOTIFICATION_CONSUMER_GROUP = "notification-service";

// Durée de conservation d'une notification, en jours entiers (D10) ; exposée au web dans `retentionDays` de la liste
export const NOTIFICATION_RETENTION_DAYS = 90;
