# 15 · Service de notification — User stories

> Sources : README racine : « Notifications (COULD) » (spec reprise et amendée par `README.md` D1 à D16) ; maquettes `22 · Notifications` et `22.1 · Toaster`, réduites le 2026-11-17. Décisions : `README.md`.

## Point de départ

| Couche | Existant | Manque |
| --- | --- | --- |
| `apps/notification-service` | Rien. `.github/workflows/ci.yml` : matrice de tests et PostgreSQL (`trading_test` seulement). `apps/market-service` (Express, clé interne, `proxy` de core-backend) et `apps/risk-engine` (consumer Kafka) donnent les deux formes à copier. | Service : `env.ts`, `index.ts`, `/health`, consumer, service, repository, routes internes, flux SSE, purge. |
| `packages/contracts/src/` | `event.ts` (`kafkaEventSchema`), `pagination.ts` (`Paginated`, `paginationQuerySchema`), `internal.ts` (`INTERNAL_KEY_HEADER`), `error.ts` (`API_ERROR_CODES`). | `notification.ts` : topic, types, catégories, paramètres, schéma de l'événement, DTO de la liste. |
| `apps/core-backend` | Transitions gardées dans `services/backtest.service.ts` (`complete`, `fail`, `failStaleExecutions`, qui ne renvoie qu'un nombre), `projection.service.ts` (`store`), `risk.service.ts` (`setLimit`, `check`). `utils/proxy.ts` (`proxyTo`, délai 10 s) et `routes/market/` pour le modèle de relais. `lib/kafka.ts` (producteur). | Publication de `notification.requested` dans ces services ; `failStaleExecutions` doit identifier les exécutions expirées ; routes `/api/notifications` (relais, dont le flux SSE sans délai). |
| `apps/web` | Page `app/app/notifications/page.tsx` (en-tête seul), entrée de sidebar `notifications` (`constants/sidebar.tsx`), clés `navigation.tabs.notifications` et `pages.notifications.description`, `lib/api.ts` (`fetch` avec cookies). Aucune primitive Toast. | `features/notifications/` : `api.ts`, `hook.ts`, liste, onglets, groupes par date, flux SSE, toaster (primitive à ajouter), compteur de la sidebar, dictionnaires FR/EN, `COMPONENTS.md`. |

## Hors périmètre

- Préférences par type de notification et e-mail (COULD).
- Types Paper trading, Rapports et Optimisation : chacun naît avec sa feature.
- Rejeu des notifications manquées pendant une coupure du flux (`Last-Event-ID`) ; le web recharge le compteur à la reconnexion.
- Outbox transactionnelle (D7, dette).
- Notification de la projection restée `PENDING` (`UNAVAILABLE` calculé à la lecture, D5).

## Décisions à valider

Toutes validées le 2026-11-17 (voir `README.md`, D1 à D16).

---

## User stories

### Lot 1 — Contrat et source

#### US-01 · Recevoir une notification pour chaque événement du système — MUST

**En tant qu’** utilisateur, **je veux** qu’une notification soit créée quand un backtest se termine ou échoue, qu’une projection est calculée ou qu’une contrainte de risque n’est plus respectée **afin de** ne pas surveiller les écrans pendant que le système calcule.

Critères d’acceptation :
- [ ] `core-backend` publie `notification.requested` après chaque transition qui a modifié une ligne, et jamais sur un rejeu ni sur un événement tardif ignoré (D5).
- [ ] Une exécution expirée par le balayage `EXECUTION_TIMEOUT` produit une notification `BACKTEST_FAILED` par exécution, avec son propriétaire.
- [ ] Le `PUT` de limite qui rend la contrainte `VIOLATED` produit `RISK_CONSTRAINT_VIOLATED` ; un `PUT` identique à la limite actuelle, ou qui la respecte, n'en produit pas.
- [ ] Le contrat ne porte aucun texte rendu ; chaque champ numérique a son unité en commentaire (ratio, date `YYYY-MM-DD`).
- [ ] Chaque exécution d'un lot de backtests notifie séparément (D13).
- [ ] Un message rejoué (même `dedupKey`) ne crée ni deuxième ligne ni deuxième push ; un message invalide est loggué (`logger.warn`) et ignoré.
- [ ] Une notification n'est visible que de son propriétaire.

Tâches : T-01, T-02, T-03, T-04, T-05, T-06 (détail dans `TASKS.md`).

### Lot 2 — Consultation

#### US-02 · Consulter mes notifications — MUST

**En tant qu’** utilisateur, **je veux** une page qui liste mes notifications, filtrables et classées par jour, **afin de** retrouver ce qui s'est passé pendant mon absence.

Critères d’acceptation :
- [ ] La page `22 · Notifications` affiche les notifications du plus récent au plus ancien, avec la pagination existante (D14), groupées « Aujourd'hui », « Hier », « Cette semaine » (regroupement d'affichage seulement), chacune avec son icône d'état, son titre et sa ligne de détail traduits (FR/EN) depuis le type et les valeurs reçues.
- [ ] Les onglets `Toutes · n`, `Non lues · n`, `Backtests` et `Risque` filtrent par la requête (`unread`, `category`) ; les nombres des onglets (`counts`) viennent de l'API.
- [ ] « Voir » ouvre le résultat concerné (backtest, risque ou projection) et marque la notification lue.
- [ ] Sans notification, la page affiche un état vide ; la mention « Conservées 90 jours » est affichée et correspond à `NOTIFICATION_RETENTION_DAYS`.
- [ ] Une notification de plus de 90 jours est supprimée par la purge périodique.

Tâches : T-05, T-07, T-09, T-10, T-11.

#### US-03 · Gérer lu / non lu — MUST

**En tant qu’** utilisateur, **je veux** voir combien de notifications je n'ai pas lues et les marquer lues **afin de** repérer ce qui est nouveau.

Critères d’acceptation :
- [ ] Le compteur de la sidebar (route `unread-count`) et la pastille « n non lues » de l'en-tête (`counts.unread`) viennent de l'API ; le web ne compte rien.
- [ ] « Tout marquer comme lu » met `readAt` sur toutes les notifications non lues de l'utilisateur, et le compteur tombe à 0 sans recharger la page.
- [ ] Marquer lue une notification déjà lue ne change rien (idempotent) ; l'identifiant d'une autre personne répond `404`.

Tâches : T-07, T-10, T-11, T-12.

### Lot 3 — Temps réel

#### US-04 · Être prévenu sur n'importe quelle page — MUST

**En tant qu’** utilisateur, **je veux** voir un toaster quand une notification arrive, où que je sois dans l'application, **afin de** réagir sans ouvrir la page Notifications.

Critères d’acceptation :
- [ ] Le toaster `22.1` s'affiche en bas à droite à la réception, empile au plus 3 notifications (D13), se ferme seul et par sa croix, et propose « Voir » (qui marque lue, D15). Il n'apparaît pas sur la page Notifications.
- [ ] La page Notifications se met à jour à la réception (liste, nombres des onglets), sans doublon avec la liste déjà chargée.
- [ ] Le flux SSE ne livre que les notifications de l'utilisateur connecté et n'est pas coupé par le délai du proxy ; sans session, il répond `401`.
- [ ] À la reconnexion du flux, le web recharge le compteur et la liste (pas de rejeu côté serveur, D11).
- [ ] Un service arrêté ne casse pas l'application : le flux se rétablit seul (reconnexion native d'`EventSource`).

Tâches : T-08, T-10, T-12.

---

## Récapitulatif

| US | Titre | Priorité | Lot | Couches |
| --- | --- | --- | --- | --- |
| US-01 | Recevoir une notification pour chaque événement du système | MUST | 1 | contracts, core-backend, notification-service |
| US-02 | Consulter mes notifications | MUST | 2 | notification-service, core-backend, web |
| US-03 | Gérer lu / non lu | MUST | 2 | notification-service, core-backend, web |
| US-04 | Être prévenu sur n'importe quelle page | MUST | 3 | notification-service, core-backend, web |
