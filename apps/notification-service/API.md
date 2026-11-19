# API notification-service

Catalogue des routes internes de notification-service (port 8002, base PostgreSQL `notifications`). Le web ne les appelle **jamais directement** : il passe par le proxy de core-backend (`/api/notifications/*`, liste blanche), qui vérifie la session et transmet l'utilisateur dans `x-user-id`. Toute création, modification ou suppression de route met à jour son entrée **dans le même diff que le code**. En cas d'écart, le code fait foi : corrige l'entrée.

## Sommaire

- [Conventions communes](#conventions-communes)
- [`GET /api/notifications`](#get-apinotifications)
- [`GET /api/notifications/unread-count`](#get-apinotificationsunread-count)
- [`POST /api/notifications/:id/read`](#post-apinotificationsidread)
- [`POST /api/notifications/read-all`](#post-apinotificationsread-all)
- [`GET /api/notifications/stream`](#get-apinotificationsstream)

## Conventions communes

- **Chemin** : identique de bout en bout (web → core-backend → notification-service).
- **Auth** : `x-internal-key` (valeur `INTERNAL_API_KEY`, posée par le proxy) **et** `x-user-id` sont exigés sur toutes les routes sauf les sondes → sinon `401 { "error": "Unauthorized", "code": "UNAUTHORIZED" }`. `userId` vient de `x-user-id` seulement, jamais du body ni de la query.
- **Sondes** (sans clé interne ni `x-user-id`, `registerProbes` de `@azimut/http`, enregistrées avant `internalAuthMiddleware`) : `GET /liveness` → toujours `200 { "status": "ok" }` ; `GET /readiness` → `200 { "status": "ok", "checks": { "database": "ok", "kafka": "ok" } }`, ou `503 { "status": "unavailable", "checks": { … } }` dès que la base `notifications` ne répond pas (`isDbConnected` de `utils/db.ts`) ou que le consumer n'a pas rejoint son groupe (`KafkaConsumer.isReady()`, `"down"`). Lu par core-backend (page Monitoring) et Kubernetes.
- **Port** : `env.PORT` (défaut 8002).
- **Erreurs** : `AppError` → `{ "error": "<message anglais>", "code": "<CODE>", ...data }` avec son statut ; toute autre exception → `500 { "error": "Internal server error", "code": "INTERNAL_ERROR" }`.
- **Types** : `NotificationView`, `NotificationList`, `NotificationCounts`, `NOTIFICATION_TYPES`, `NOTIFICATION_CATEGORIES` dans `@azimut/contracts` (`src/notification.ts`) ; entrées zod du service dans `interfaces/notification.interface.ts`. Dates ISO 8601. **Aucun texte rendu** : le web traduit `type` et `params`.
- **Isolation** : une notification n'est visible que de son propriétaire ; l'identifiant d'une autre personne répond `404 NOTIFICATION_NOT_FOUND`.

### GET /api/notifications

- **Auth** : clé interne + `x-user-id`.
- **Entrée** : query `listNotificationsQuerySchema` : `category` (`BACKTESTS` | `RISK`, facultatif), `unread` (`true` | `false`, `true` ne garde que les non lues), `page` (entier ≥ 1, défaut `1`), `pageSize` (entier 1 à 100, défaut `20`).
- **Réponse** : `200`, `NotificationList` : `Paginated<NotificationView>` (`data` du plus récent au plus ancien, `count` = total du filtre, `page`, `pageSize`) plus `counts` (`all`, `unread`, `BACKTESTS`, `RISK` : entiers ≥ 0, **indépendants** du filtre, ce sont les nombres des onglets) et `retentionDays` (jours de conservation, `NOTIFICATION_RETENTION_DAYS` = 90).
  ```json
  {
    "data": [{ "id": "…", "type": "BACKTEST_COMPLETED", "category": "BACKTESTS", "params": { "backtestId": "…", "name": "Mon backtest", "cagr": 0.12, "sharpe": 1.1, "maxDrawdown": 0.18 }, "createdAt": "2026-11-17T10:00:00.000Z", "readAt": null }],
    "count": 1, "page": 1, "pageSize": 20,
    "counts": { "all": 4, "unread": 2, "BACKTESTS": 3, "RISK": 1 },
    "retentionDays": 90
  }
  ```
- **Erreurs** : `400 { "code": "INVALID_QUERY", "issues": [ZodIssue] }` → `category`, `unread`, `page` ou `pageSize` invalide.
- **Effets** : aucun.
- **Appelant** : aucun encore (web : roadmap 15, T-11).
- **Source** : `routes/notification/notification.routes.ts`, `controller/notification.controller.ts` (`list`), `services/notification.service.ts` (`list`), `repositories/notification.repository.ts` (`list`, `counts`).

### GET /api/notifications/unread-count

- **Auth** : clé interne + `x-user-id`.
- **Entrée** : aucune.
- **Réponse** : `200 { "count": 2 }` : entier ≥ 0, notifications non lues de l'utilisateur.
- **Erreurs** : aucune propre à la route.
- **Effets** : aucun.
- **Appelant** : aucun encore (web : compteur de la sidebar, T-12).
- **Source** : `controller/notification.controller.ts` (`unreadCount`), `services/notification.service.ts` (`countUnread`), `repositories/notification.repository.ts` (`countUnread`).

### POST /api/notifications/:id/read

- **Auth** : clé interne + `x-user-id`.
- **Entrée** : params `id` (`notificationIdSchema`, string non vide) ; pas de body.
- **Réponse** : `204` sans corps. Idempotent : marquer lue une notification déjà lue ne change rien (`readAt` conservé).
- **Erreurs** : `404 { "code": "NOTIFICATION_NOT_FOUND" }` → la notification n'existe pas ou appartient à un autre utilisateur.
- **Effets** : `readAt` posé si la notification était non lue.
- **Appelant** : aucun encore (web : « Voir », T-11).
- **Source** : `controller/notification.controller.ts` (`markRead`), `services/notification.service.ts` (`markRead`), `repositories/notification.repository.ts` (`markRead`).

### POST /api/notifications/read-all

- **Auth** : clé interne + `x-user-id`.
- **Entrée** : aucune.
- **Réponse** : `204` sans corps. Idempotent.
- **Erreurs** : aucune propre à la route.
- **Effets** : `readAt` posé sur toutes les notifications non lues de l'utilisateur.
- **Appelant** : aucun encore (web : « Tout marquer comme lu », T-11).
- **Source** : `controller/notification.controller.ts` (`markAllRead`), `services/notification.service.ts` (`markAllRead`), `repositories/notification.repository.ts` (`markAllRead`).

### GET /api/notifications/stream

- **Auth** : clé interne + `x-user-id`. Sans `x-user-id` : `401`.
- **Entrée** : aucune.
- **Réponse** : `200`, `Content-Type: text/event-stream`, connexion laissée ouverte (`Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`). Premier commentaire `: connected`, puis un commentaire `: ping` toutes les 25 s (`NOTIFICATION_HEARTBEAT_MS`), puis un événement par nouvelle notification **de l'utilisateur seulement** :
  ```text
  event: notification
  data: {"id":"…","type":"BACKTEST_FAILED","category":"BACKTESTS","params":{…},"createdAt":"2026-11-17T10:00:00.000Z","readAt":null}
  ```
  `data` = `NotificationView` en JSON. Pas de rejeu à la reconnexion (D11) : le client recharge compteur et liste. Plusieurs connexions d'un même utilisateur reçoivent toutes l'événement ; un rejeu Kafka (même `dedupKey`) ne pousse rien.
- **Erreurs** : `401` sans clé interne ou sans `x-user-id`.
- **Effets** : abonnement en mémoire (`NotificationStreamService`), retiré à la fermeture du client.
- **Appelant** : aucun encore (web : `EventSource`, T-12).
- **Source** : `controller/notification.controller.ts` (`stream`), `services/notification-stream.service.ts`, `services/notification.service.ts` (`record` diffuse).
