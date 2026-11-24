# fix-10 · Paramètres : profil et préférences de notification — Tâches

> Échelle de points, statuts et définition de terminé commune : `roadmap/README.md`. Points prévus. Un commit par tâche verte.

## Synthèse

| Tâche | Titre | US | Couche | Priorité | Points | Dépend de | Commits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | Maquettes Figma : Profil (06) et Notifications (06.1) | US-01 | design | MUST | 2 | — | |
| T-02 | `ProfileCard` : schéma, mutation `updateUser`, messages FR/EN, tests | US-01 | web | MUST | 5 | T-01 | |
| T-03 | Onglet Profil par défaut dans `SettingsTabs` | US-01 | web | MUST | 2 | T-02 | |
| T-04 | Contrat des préférences de notification | US-02 | contracts | SHOULD | 2 | — | |
| T-05 | notification-service : modèle, repository, service, routes, tests | US-02 | backend | SHOULD | 5 | T-04 | |
| T-06 | Consumer : écarter les catégories désactivées, tests | US-02 | backend | SHOULD | 3 | T-05 | |
| T-07 | core-backend : routes des préférences dans le proxy, `API.md` | US-02 | backend | SHOULD | 1 | T-05 | |
| T-08 | `NotificationPreferencesCard` : api, hook, interrupteurs, tests | US-02 | web | SHOULD | 5 | T-01, T-04, T-07 | |
| T-09 | Onglet Notifications dans `SettingsTabs`, catalogue | US-02 | web | SHOULD | 1 | T-03, T-08 | |
| T-10 | E2E Paramètres : nom et préférence | US-03 | web | MUST | 3 | T-03, T-06, T-09 | |
| T-11 | Clôture : catalogues, `TECH-DEBT.md`, roadmap | US-03 | docs | MUST | 1 | T-10 | |

**Total** : 30 points — MUST 13, SHOULD 17.

| Lot | Tâches | Points |
| --- | --- | --- |
| 1. Profil | T-01 → T-03 | 9 |
| 2. Préférences de notification | T-04 → T-09 | 17 |
| 3. Preuve et clôture | T-10, T-11 | 4 |

**Chemin critique** (16 points) : T-04 → T-05 → T-07 → T-08 → T-09 → T-10 → T-11. T-08 est la tâche la plus risquée (mise à jour optimiste, retour arrière).

**Parallélisable** : lot 1 et T-04/T-05 ; T-06 et T-07 ; T-02 et T-04.

## Graphe des dépendances

```mermaid
flowchart LR
    T01 --> T02 --> T03 --> T09
    T01 --> T08
    T04 --> T05 --> T06 --> T10
    T05 --> T07 --> T08 --> T09 --> T10 --> T11
    T04 --> T08
    T03 --> T10
```

---

## Lot 1 — Profil

### T-01 · Maquettes Figma : Profil (06) et Notifications (06.1)

- **US** : US-01 · **Priorité** : MUST · **Points** : 2 · **Dépend de** : —
- **Fichiers** : Figma `Trading`, copies `06 · Paramètres · Profil · à modifier (F-fix-10)` et `06.1 · … · à modifier (F-fix-10)`

Critères d'acceptation :
- [ ] 06 : un onglet Profil sans « Changer la photo », e-mail désactivé, sans cartes Portefeuille ni Apparence ; onglets de la barre : Profil, Notifications, Apparence.
- [ ] 06.1 : deux interrupteurs (Backtests, Risque), sans carte « Canaux de réception ».
- [ ] États erreur et enregistrement dessinés ; validation de l'utilisateur avant T-02 et T-08.

### T-02 · `ProfileCard` : schéma, mutation `updateUser`, messages FR/EN, tests

- **US** : US-01 · **Priorité** : MUST · **Points** : 5 · **Dépend de** : T-01
- **Fichiers** : `apps/web/src/features/settings/profile-card.tsx`, `schema.ts`, `hook.ts`, `src/lib/auth.ts` (export `updateUser`), `messages/fr.json`, `messages/en.json`, `test/profile-card.test.tsx`

Critères d'acceptation :
- [ ] Champs `Form` existants (`components/form/`), `SettingsCard` pour le cadre ; schéma zod en fabrique (messages traduits), nom de 1 à 100 caractères.
- [ ] `updateUser({ name })` ; la session est relue (`authClient` sans cache de cookie) pour que `nav-user` change aussitôt.
- [ ] Toast de succès ; erreur serveur affichée, saisie conservée.
- [ ] Tests : validation, bouton désactivé sans changement, appel et erreur (`authClient` espionné).

### T-03 · Onglet Profil par défaut dans `SettingsTabs`

- **US** : US-01 · **Priorité** : MUST · **Points** : 2 · **Dépend de** : T-02
- **Fichiers** : `features/settings/settings-tabs.tsx`, `COMPONENTS.md` (settings), `messages/*.json` (`settings.tabs.profile`), `test/`

Critères d'acceptation :
- [ ] Onglets Profil (défaut) puis Apparence ; JSDoc et catalogue à jour (le commentaire « seul Apparence existe » disparaît).
- [ ] Test de rendu des onglets.

## Lot 2 — Préférences de notification

### T-04 · Contrat des préférences de notification

- **US** : US-02 · **Priorité** : SHOULD · **Points** : 2 · **Dépend de** : —
- **Fichiers** : `packages/contracts/src/notification.ts`, `packages/contracts/test/`

Critères d'acceptation :
- [ ] `notificationPreferencesSchema` : un booléen par entrée de `NOTIFICATION_CATEGORIES` ; type dérivé par `z.infer`, jamais recopié.
- [ ] Schéma de mise à jour partielle (au moins une catégorie) ; tests du schéma.

### T-05 · notification-service : modèle, repository, service, routes, tests

- **US** : US-02 · **Priorité** : SHOULD · **Points** : 5 · **Dépend de** : T-04
- **Fichiers** : `apps/notification-service/prisma/schema.prisma` + migration, `repositories/`, `services/`, `routes/notification/`, `controller/`, `API.md`, `test/`

Critères d'acceptation :
- [ ] `NotificationPreference` (`userId` unique, un booléen par catégorie `@default(true)`), sans clé étrangère.
- [ ] `GET /api/notifications/preferences` (ligne absente = tout activé, sans l'écrire) et `PUT` (upsert) ; `userId` pris de `x-user-id`, jamais du corps.
- [ ] Logique dans le service, Prisma dans le repository ; tests de repository (`describeWithDb`), service (faux repository) et route (`startApp`).
- [ ] Migration rappelée au résumé (`bun run db:generate`) ; `API.md` du service à jour.

### T-06 · Consumer : écarter les catégories désactivées, tests

- **US** : US-02 · **Priorité** : SHOULD · **Points** : 3 · **Dépend de** : T-05
- **Fichiers** : `services/notification.service.ts` (`record`), `consumers/notification.consumer.ts`, `test/notification.service.test.ts`, `test/notification.consumer.test.ts`

Critères d'acceptation :
- [ ] `record` lit les préférences de `payload.userId` ; catégorie désactivée : ni insertion ni diffusion SSE, `logger.info` et retour `null`.
- [ ] Message invalide : `logger.warn` et retour, jamais d'exception ; base indisponible : l'exception repart à kafkajs.
- [ ] Tests : catégorie désactivée, activée, préférence absente, rejeu.

### T-07 · core-backend : routes des préférences dans le proxy, `API.md`

- **US** : US-02 · **Priorité** : SHOULD · **Points** : 1 · **Dépend de** : T-05
- **Fichiers** : `apps/core-backend/routes/notification/notification.routes.ts`, `API.md`, test de route du proxy

Critères d'acceptation :
- [ ] `GET` et `PUT /api/notifications/preferences` ajoutés à la liste blanche, sous `authMiddleware`, `x-user-id` remplacé par `req.userId`.
- [ ] Entrée `API.md` (gabarit du catalogue) ; test : sans session `401`.

### T-08 · `NotificationPreferencesCard` : api, hook, interrupteurs, tests

- **US** : US-02 · **Priorité** : SHOULD · **Points** : 5 · **Dépend de** : T-01, T-04, T-07
- **Fichiers** : `features/settings/notification-preferences-card.tsx`, `api.ts`, `hook.ts`, `messages/*.json`, `test/notification-preferences.test.tsx`

Critères d'acceptation :
- [ ] `Switch` shadcn (`components/ui/switch.tsx`), `fetch` uniquement dans `api.ts`, types dérivés du contrat.
- [ ] Mise à jour optimiste avec retour arrière et toast d'erreur ; état de chargement sans clignotement.
- [ ] Tests : affichage des valeurs reçues, bascule, retour arrière sur erreur.

### T-09 · Onglet Notifications dans `SettingsTabs`, catalogue

- **US** : US-02 · **Priorité** : SHOULD · **Points** : 1 · **Dépend de** : T-03, T-08
- **Fichiers** : `features/settings/settings-tabs.tsx`, `COMPONENTS.md` (settings), `messages/*.json`

Critères d'acceptation :
- [ ] Ordre : Profil, Notifications, Apparence ; entrées `COMPONENTS.md` des nouveaux composants.

## Lot 3 — Preuve et clôture

### T-10 · E2E Paramètres : nom et préférence

- **US** : US-03 · **Priorité** : MUST · **Points** : 3 · **Dépend de** : T-03, T-06, T-09
- **Fichiers** : `apps/web/e2e/settings.e2e.ts`

Critères d'acceptation :
- [ ] Renommer l'utilisateur : le nouveau nom apparaît dans la sidebar.
- [ ] Désactiver « Backtests », recharger : l'interrupteur reste désactivé ; le parcours ne vérifie aucun chiffre.

### T-11 · Clôture : catalogues, `TECH-DEBT.md`, roadmap

- **US** : US-03 · **Priorité** : MUST · **Points** : 1 · **Dépend de** : T-10
- **Fichiers** : `TECH-DEBT.md`, `roadmap/fix-10-parametres-profil/`, `roadmap/README.md`

Critères d'acceptation :
- [ ] `TECH-DEBT.md` : onglet Portefeuille (feature paper trading), canaux e-mail et navigateur, changement d'e-mail et de mot de passe, photo.
- [ ] Cases cochées, commits et points réalisés, bilan du README ; statut `Livrée` dans l'index.
