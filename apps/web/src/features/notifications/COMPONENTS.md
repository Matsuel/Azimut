# Catalogue web : `features/notifications`

Page Notifications (feature 15, maquette `22 · Notifications`) et toaster (`22.1`). Toutes les valeurs viennent de `GET /api/notifications` (liste, `counts` des onglets, `retentionDays`) et de `GET /api/notifications/unread-count` : le web ne compte rien, il formate les ratios, traduit titre et détail de chaque type depuis ses paramètres, et regroupe la page reçue par jour (affichage). Gabarits d'entrée : [`COMPONENTS.md`](../../../COMPONENTS.md#gabarits).

### NotificationCenter

- **Import** : `import { NotificationCenter } from "@/features/notifications/notification-center"`.
- **Rôle** : écran de la route `routes.notifications` : en-tête avec la pastille « n non lues » (`counts.unread`, masquée à 0) et « Tout marquer comme lu » ; carte avec `FilterTabs` (Toutes · n, Non lues · n, Backtests, Risque : le filtre part à l'API, changer d'onglet revient à la page 1), « Conservées n jours » (`retentionDays`), `NotificationGroups`, `TablePagination`. États : chargement, erreur (« Réessayer »), vide. « Voir » marque lue une notification non lue puis ouvre son résultat (`notificationRoute`). Instancie les mutations et la requête.
- **Props** : aucune.
- **Source** : `src/features/notifications/notification-center.tsx`.

### NotificationBody

- **Import** : `import { NotificationBody } from "@/features/notifications/notification-body"`.
- **Rôle** : corps de la carte de `NotificationCenter` : un seul état, chargement, erreur (« Réessayer »), vide ou `NotificationGroups`.
- **Props** :
  - `query` : requête de `useNotifications`.
  - `onView` : action de « Voir ».
- **Source** : `src/features/notifications/notification-body.tsx`.

### NotificationGroups

- **Import** : `import { NotificationGroups } from "@/features/notifications/notification-groups"`.
- **Rôle** : une section par jour (« Aujourd'hui », « Hier », « Cette semaine », « Plus ancien », `groupByDay`) avec une `NotificationRow` par notification.
- **Props** :
  - `notifications` : page reçue, la plus récente d'abord.
  - `onView` : appelé avec la notification quand « Voir » est cliqué.
- **Source** : `src/features/notifications/notification-groups.tsx`.

### NotificationRow

- **Import** : `import { NotificationRow } from "@/features/notifications/notification-row"`.
- **Rôle** : ligne de la liste : `NotificationIcon`, titre et détail (`useNotificationText`), date et catégorie (`formatWhen`), « Voir » et pastille bleue tant que la notification n'est pas lue (fond `bg-muted`).
- **Props** :
  - `notification` : `NotificationView`.
  - `now` : instant de référence de `formatWhen` (le même pour toute la page).
  - `onView` : action de « Voir ».
- **Source** : `src/features/notifications/notification-row.tsx`.

### NotificationIcon

- **Import** : `import { NotificationIcon } from "@/features/notifications/notification-icon"`.
- **Rôle** : icône d'état dans un rond bordé : succès (backtest, projection), échec, avertissement (contrainte de risque), table `notificationIcons`.
- **Props** :
  - `type` : `NotificationType`.
  - `className` (optionnel) : mise en page du rond.
- **Source** : `src/features/notifications/notification-icon.tsx`.

### NotificationToaster

- **Import** : `import { NotificationToaster } from "@/features/notifications/toaster"`.
- **Rôle** : monté une fois dans `app/app/layout.tsx` : ouvre le flux SSE (`useNotificationStream`) et rend le `Toaster` (`ui/sonner`) en bas à droite, au plus `MAX_TOASTS` empilés, fermeture par la croix ou après `TOAST_DURATION_MS`. Pas de toaster sur la page Notifications (D15). « Voir » marque lue et ouvre le résultat.
- **Props** : aucune.
- **Source** : `src/features/notifications/toaster.tsx`.

### UnreadBadge

- **Import** : `import { UnreadBadge } from "@/features/notifications/unread-badge"`.
- **Rôle** : pastille du compteur de non lues (`GET /unread-count`) à droite de l'onglet « Notifications » (`badge` de `SidebarTab`) ; rien à 0.
- **Props** : aucune.
- **Source** : `src/features/notifications/unread-badge.tsx`.

### `features/notifications/api.ts`

- **Import** : `import { getNotifications, … } from "@/features/notifications/api"`.

| Export | Rôle (et unité) |
| --- | --- |
| `getNotifications` | `GET /notifications?page&pageSize&category&unread` : `NotificationList` (`counts`, `retentionDays`). |
| `getUnreadCount` | `GET /notifications/unread-count` : `{ count }` (entier ≥ 0). |
| `markNotificationRead` | `POST /notifications/:id/read` (204, idempotent). |
| `markAllNotificationsRead` | `POST /notifications/read-all` (204). |

### `features/notifications/hook.ts`

- **Import** : `import { useNotifications, … } from "@/features/notifications/hook"`.

| Export | Rôle |
| --- | --- |
| `notificationsKey` | Clé commune `["notifications"]` : l'invalider rafraîchit liste, onglets et compteur. |
| `useNotifications` | Liste paginée filtrée (garde la page affichée pendant le changement d'onglet). |
| `useUnreadCount` | Compteur de la sidebar. |
| `useMarkNotificationRead`, `useMarkAllNotificationsRead` | Mutations qui invalident `notificationsKey`. |

### `features/notifications/stream.tsx`, `use-notification-text.ts`, `utils.ts`, `constants.ts`, `types.ts`

| Export | Rôle |
| --- | --- |
| `useNotificationStream` | `EventSource` unique (cookies inclus) sur `/notifications/stream`, événement `notification` : invalide `notificationsKey` (aussi à chaque ouverture/reconnexion) et affiche le toaster. |
| `useNotificationText()` | Fonction `(NotificationView) → { title, detail }` traduite (FR/EN) à partir du type et des paramètres ; ratios formatés, drawdown négatif. |
| `dayGroup`, `groupByDay` | Groupe d'affichage d'un jour (`today`, `yesterday`, `week`, `older`) et regroupement d'une page. |
| `notificationRoute` | Page du résultat concerné (`routes.backtest`, `backtestRisk`, `backtestProjection`). |
| `formatWhen(f, createdAt, now)` | « il y a 5 min », « hier, 18:42 », « dim. 25/10 ». |
| `notificationTabs`, `NotificationTab` | Filtre API de chaque onglet. |
| `notificationIcons` | Icône et couleur par type. |
| `MAX_TOASTS`, `TOAST_DURATION_MS` | Toaster : 3 empilés (D13), 8 s avant fermeture. |
| types | Réexports des types du contrat (`NotificationView`, `NotificationList`, `NotificationCounts`…) et `UnreadCount`. |
