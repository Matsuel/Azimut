# 15 · Service de notification

- **Statut** : Planifiée
- **Roadmap** : Mois 7 — remontée du COULD « Notifications » (2026-11-17) : service dédié, page et toaster ; le reste de la spec du README racine (préférences, e-mail, paper trading, rapports) reste COULD
- **Période** : à fixer au démarrage de la feature
- **Branche / PR** : `feat/notification-service` — PR à ouvrir
- **Points** : 44 (MUST 44, SHOULD 0) — prévus
- **Maquettes** : `22 · Notifications` (node `303:6483`) et `22.1 · Toaster (notification reçue sur une autre page)` (node `303:7236`), section Figma `Feature 15 · Notifications (22)` (node `578:14658`). Réduites le 2026-11-17 au périmètre de la feature (voir « Écrans modifiés »)
- **Écrans modifiés** : aucun. Le compteur de la sidebar est déjà dessiné sur les écrans (`Notifications` + badge) ; il n'est branché qu'au codage (T-12). Les cadres 22 et 22.1 sont des écrans neufs, retouchés en place : sans « Optimisation terminée », « Versement exécuté », « Rapport T3 disponible », sans onglets « Paper trading » et « Rapports », sans bouton « Préférences » ; 4 notifications, 2 non lues
- **Dépend de** : 13 (contrainte de risque), 14 (projection). Les 4 types de notification viennent des backtests, du risque et de la projection : aucun autre prérequis.

## Objectif

L'utilisateur est prévenu quand un calcul asynchrone se termine ou échoue, ou qu'une contrainte de risque n'est plus respectée, sans rester sur la page concernée : un toaster s'affiche où qu'il soit, et la page Notifications garde l'historique (90 jours) avec le compteur de non lues dans la sidebar. Le service est un microservice à part entière, ce qui prépare la cible Kubernetes (23) sans toucher au chemin de calcul.

## Comment

```text
core-backend (transition gardée appliquée) ──notification.requested──▶ notification-service ──▶ base `notifications`
                                                                          │  └─ SSE ─▶ proxy core-backend ─▶ web (toaster)
web ─GET/POST /api/notifications/*─▶ core-backend (authMiddleware, x-user-id, clé interne) ─▶ notification-service
```

`core-backend` reste le seul à connaître l'utilisateur, le nom du backtest et la règle « contrainte violée » : après chaque transition qui a réellement modifié une ligne, il publie `notification.requested` (ni texte, ni langue : le type et des valeurs chiffrées). `notification-service` valide, enregistre de façon idempotente (`dedupKey` unique), pousse la notification au flux SSE de l'utilisateur, et expose la liste, le compteur, « lu » et « tout lire » derrière le proxy de `core-backend`, comme market-service. Le web affiche et formate via `messages/` ; il ne compte rien.

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | **Service dédié** `apps/notification-service` avec **sa propre base** (schéma Prisma et base `notifications` distincts). Exception à « core-backend seul écrivain en base » : les règles amendées sont listées dans T-13. | Choix de l'utilisateur : un vrai microservice. La table n'a aucune jointure avec le domaine : pas de coût de données partagées. | Décision du 2026-11-17 |
| D2 | **Source** : `core-backend` publie `notification.requested` après chaque transition gardée qui a modifié une ligne. Le service ne consomme aucun topic du domaine. | `risk.completed` et `projection.completed` ne portent pas de `userId` ; la contrainte violée et le balayage `EXECUTION_TIMEOUT` n'existent que dans core-backend. | Décision du 2026-11-17 |
| D3 | **Contrat** : `userId`, `type`, `dedupKey`, `params` typés par type, avec unité commentée. **Aucun texte rendu** : le web traduit via `messages/` (FR/EN, feature 10). | Un texte français stocké casserait la langue. | Décision du 2026-11-17 |
| D4 | **Types** : `BACKTEST_COMPLETED`, `BACKTEST_FAILED`, `RISK_CONSTRAINT_VIOLATED`, `PROJECTION_COMPLETED`. Catégories d'onglet : `BACKTESTS` (backtest, projection), `RISK`. | Ce que montre la maquette 22 et que le système sait déjà produire. | Décision du 2026-11-17 |
| D5 | **Sources exactes** : `backtest.completed` (si transition), `backtest.failed` et balayage `EXECUTION_TIMEOUT` (une notification par exécution expirée), `projection.completed` avec une projection non nulle (première réception), `PUT` de limite de risque qui rend la contrainte `VIOLATED`. Pas de notification pour un résultat de projection `null`, ni pour le passage `PENDING` → `UNAVAILABLE` d'une projection (calculé à la lecture, il n'y a pas de transition). | Une notification = un changement d'état observé une seule fois. | Décision du 2026-11-17 |
| D6 | **Idempotence** : `dedupKey` (`<type>:<executionId>` ; pour la contrainte, `<type>:<backtestId>:<limite>`) unique en base ; un rejeu n'insère rien et ne pousse rien. | Kafka at-least-once. La clé est métier : `createKafkaEvent` crée un nouvel `eventId` à chaque publication. | Décision du 2026-11-17 |
| D7 | **Perte acceptée** : pas d'outbox. Un crash de core-backend entre le commit et la publication perd la notification (le rejeu ne la recrée pas : la transition gardée ne modifie plus rien). | Une notification n'est pas une donnée métier ; l'outbox coûte une table et un relais. Inscrit en dette technique (T-13). | Décision du 2026-11-17 |
| D8 | **Temps réel** : SSE (`GET /api/notifications/stream`), pas WebSocket. `EventSource` avec cookies, relayé par le proxy de core-backend (`authMiddleware`, puis `x-user-id` et clé interne). Battement toutes les 25 s ; pas de rejeu à la reconnexion : le web recharge le compteur. | Sans dépendance, natif navigateur, un seul sens suffit. Le canal WebSocket du README racine vient de l'ancien trading : il est corrigé. | Décision du 2026-11-17 |
| D9 | **API** (toutes derrière `authMiddleware`) : `GET /api/notifications?category&unread&page&pageSize` (pagination existante) avec `unreadCount`, `GET /api/notifications/unread-count`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all`, `GET /api/notifications/stream`. Une notification d'un autre utilisateur répond `404`. | Même forme que la liste des backtests. Le web ne compte jamais lui-même. | Décision du 2026-11-17 |
| D10 | **Rétention** : `NOTIFICATION_RETENTION_DAYS = 90`, purge périodique dans le service (une fois par heure). | La mention « Conservées 90 jours » de la maquette 22 est une règle backend. | Décision du 2026-11-17 |
| D11 | **Hors périmètre** : préférences par type, e-mail, types Paper trading, Rapports et Optimisation (leurs notifications reviennent avec leurs features), rejeu SSE par `Last-Event-ID`, marquage « lu » côté serveur à l'affichage du toaster. | Choix de l'utilisateur : service, page et toaster. | Décision du 2026-11-17 |
| D12 | **Numérotation** : la feature prend le numéro 15 ; les features 15 à 24 deviennent 16 à 25 (dossiers, dépendances, copies Figma `(F<NN>)`). | Respecter l'ordre d'exécution sans renvoi ambigu. | `4373b83` |

## Écarts au plan

Le README racine (section « Notifications », COULD) prévoyait un consumer dans `core-backend`, une table dans la base commune et un canal WebSocket : D1, D2 et D8 le remplacent. Les amendements de la documentation (AGENTS.md racine et core-backend, règle 3 de la revue dans CLAUDE.md, section Notifications du README racine) sont dans T-13, au moment où l'exception existe dans le code ; le journal des décisions de `roadmap/README.md` porte déjà la décision.

## Bilan

À écrire à la clôture.

## Fichiers

- [`US.md`](US.md) — user stories et critères d’acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
