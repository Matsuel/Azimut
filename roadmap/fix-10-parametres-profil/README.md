# fix-10 · Paramètres : profil et préférences de notification

- **Statut** : Livrée
- **Roadmap** : hors roadmap annuelle — terminer la page Paramètres avant la feature 21 (demande du 2026-11-24)
- **Période** : 2026-11-24 → 2026-11-24
- **Branche / PR** : `feat/parametres-profil`
- **Points** : 46 (MUST 29, SHOULD 17) — réalisés 46
- **Maquettes** (section Figma « Fix 10 · Paramètres : profil, notifications, réinitialisation (43–46) », `681:15865`) : `06 · Profil · à modifier (fix-10)` (`681:15866`), `06.1 · Notifications · à modifier (fix-10)` (`681:15933`), `06.2 · Apparence · à modifier (fix-10)` (`681:16004`), `06.3 · Réinitialiser mes données (dialog)` (`681:16073`) — dessinées et validées le 2026-11-24
- **Écrans modifiés** : `06 · Paramètres · Profil` (`18:2065`, copie fix-09 `655:15884`) : sans « Changer la photo », e-mail en lecture seule, onglet Portefeuille grisé, sans cartes « Portefeuille virtuel » et « Apparence » (elles ont leur onglet), carte « Données » avec « Réinitialiser mes données » — dessiné dans la copie `681:15866` ; `06.1 · Paramètres · Notifications` (`129:2775`) : deux catégories (Backtests, Risque) au lieu de quatre types, sans carte « Canaux de réception » — dessiné dans la copie `681:15933` ; `06.2 · Paramètres · Apparence` (`550:13954`) : barre d'onglets avec Portefeuille grisé — dessiné dans la copie `681:16004` ; `29.1 · Réinitialiser le portefeuille (dialog)` (`130:2907`) : remplacé par `06.3` (`681:16073`)

## Objectif

La page Paramètres tient ses promesses : l'utilisateur change son nom, choisit les catégories de notification qu'il veut recevoir, règle thème et langue (déjà livrés) et peut tout effacer d'un geste (« Réinitialiser mes données »). L'onglet Portefeuille (paper trading) est visible mais désactivé ; les canaux e-mail et navigateur ne s'affichent pas encore.

## Comment

Profil : `authClient.updateUser({ name })` de better-auth, déjà servi par core-backend (`/api/auth/*`) : ni route ni base à ajouter. Notifications : table `NotificationPreference` dans la base `notifications` (une ligne par utilisateur, un booléen par catégorie, `@default(true)`), exposée par notification-service, relayée par la liste blanche du proxy de core-backend ; le consumer de `notification.requested` n'enregistre pas ce qu'une catégorie désactivée écarte. Réinitialisation : `POST /api/account/reset` de core-backend supprime en transaction les backtests (et leurs allocations et exécutions), portefeuilles et calculs de pricing de l'utilisateur, puis publie `user.data.reset` ; notification-service supprime ses notifications et ses préférences (la base `notifications` n'appartient qu'à lui).

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | Nom modifiable, e-mail affiché en lecture seule. | Changer l'e-mail demande une vérification par courrier ; aucun service d'e-mail n'existe. | `US.md` |
| D2 | Pas de photo de profil : bouton absent, avatar à initiales (déjà dans `nav-user.tsx`). | Aucun stockage de fichiers dans le projet. | `US.md` |
| D3 | Onglet « Portefeuille » affiché mais désactivé (grisé, non cliquable). | Il configurera le paper trading (maquette 29), feature bonus non planifiée ; décision du 2026-11-24. Activé avec elle. | `US.md` |
| D4 | Préférences par catégorie (`BACKTESTS`, `RISK`), pas par type ni par canal. | Les catégories existantes sont celles de la page Notifications ; « alertes de prix », « ordres » et « résumé quotidien » n'ont pas de producteur. | `packages/contracts/src/notification.ts` |
| D5 | Une notification d'une catégorie désactivée n'est ni enregistrée ni diffusée en SSE (pas de ligne masquée). | Évite une liste qui change quand on réactive ; la préférence vaut pour l'avenir. | `US.md` |
| D6 | Canaux « E-mail » et « Navigateur » hors périmètre. | Pas d'envoi d'e-mail ni de push ; la carte disparaît de la maquette. | `US.md` |
| D7 | « Réinitialiser mes données » (carte « Données » de l'onglet Profil, dialog `06.3`) remet l'utilisateur comme à la création de son compte : supprime backtests (avec allocations, exécutions, résultats), portefeuilles, calculs de pricing, notifications et préférences de notification. Restent : l'identité (nom, e-mail, mot de passe, rôle) et la session. **Irréversible.** | Demande du 2026-11-24. Remplace « Réinitialiser le portefeuille » (29 / 29.1), qui visait le paper trading absent. | `US.md` |
| D8 | Le dialog demande de saisir `RÉINITIALISER` ; le récapitulatif liste les familles supprimées sans compteur. | Choix du 2026-11-24 : pas de route de comptage ; le geste reste protégé. | `681:16073` |
| D9 | Deux propriétaires, un événement : core-backend efface la base `trading` puis publie `user.data.reset` (`userId`) ; notification-service efface sa base. Consommateur idempotent (supprimer deux fois = même état). | « Seul écrivain » de chaque base (`AGENTS.md`). Un calcul encore en vol qui revient après la suppression trouve sa ligne absente : transition gardée, `logger.warn`, aucun crash. | `US.md` |

## Écarts au plan

- Bouton « Réinitialiser » : variant `destructive` existant (rouge clair, comme les autres pages), la maquette montre un rouge plein (TD-68).
- Corps invalide du `PUT` des préférences : `INVALID_BODY` ajouté au contrat (TD-66, fermée).
- `user.data.reset` a son propre groupe de consumer (`notification-service-account`) : un `KafkaConsumer` ne porte qu'un handler.
- Les colonnes Prisma des préférences sont `backtests` et `risk` (`@default(true)`) avec un `updatedAt` ; l'API garde les clés `BACKTESTS` et `RISK` (`utils/notification.mapper.ts`).
- Le web a été réalisé par sous-agents spécialisés (notification-service, core-backend, web, E2E), un worktree chacun, fusionnés sur la branche.

## Bilan

Livré : onglets Profil (nom modifiable, e-mail en lecture seule, carte « Données »), Portefeuille (grisé), Notifications (interrupteurs Backtests et Risque, filtre à l'enregistrement) et Apparence ; réinitialisation complète des données (`POST /api/account/reset`, événement `user.data.reset`, purge des notifications et préférences). Preuve : `bun run verify` à 0 échec ; E2E `settings` et `notifications` passés (5 tests), suite E2E complète non relancée. Écrans web non comparés à la mesure aux maquettes (app non lancée avec les captures Figma) : TD-68. Dettes fermées : TD-65, TD-66 ; ouvertes : TD-67, TD-68. 46 points réalisés pour 46 prévus. **À redémarrer** : core-backend, notification-service, web ; migration `20261125110000_add_notification_preference` à appliquer à la base `notifications` (`bun run db:generate`).

## Fichiers

- [`US.md`](US.md) — user stories et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
