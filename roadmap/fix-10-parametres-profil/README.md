# fix-10 · Paramètres : profil et préférences de notification

- **Statut** : Planifiée
- **Roadmap** : hors roadmap annuelle — terminer la page Paramètres avant la feature 21 (demande du 2026-11-24)
- **Période** : prévue 2026-11-24 → 2026-11-25
- **Branche / PR** : `feat/parametres-profil`
- **Points** : 46 (MUST 29, SHOULD 17) — prévus
- **Maquettes** (section Figma « Fix 10 · Paramètres : profil, notifications, réinitialisation (43–46) », `681:15865`) : `06 · Profil · à modifier (fix-10)` (`681:15866`), `06.1 · Notifications · à modifier (fix-10)` (`681:15933`), `06.2 · Apparence · à modifier (fix-10)` (`681:16004`), `06.3 · Réinitialiser mes données (dialog)` (`681:16073`) — dessinées le 2026-11-24, à valider
- **Écrans modifiés** : `06 · Paramètres · Profil` (`18:2065`, copie fix-09 `655:15884`) : sans « Changer la photo », e-mail en lecture seule, sans cartes « Portefeuille virtuel » et « Apparence » (elles ont leur onglet), carte « Données » avec « Réinitialiser mes données » — dessiné dans la copie `681:15866` ; `06.1 · Paramètres · Notifications` (`129:2775`) : deux catégories (Backtests, Risque) au lieu de quatre types, sans carte « Canaux de réception » — dessiné dans la copie `681:15933` ; `06.2 · Paramètres · Apparence` (`550:13954`) : barre d'onglets à trois onglets — dessiné dans la copie `681:16004` ; `29.1 · Réinitialiser le portefeuille (dialog)` (`130:2907`) : remplacé par `06.3` (`681:16073`)

## Objectif

La page Paramètres tient ses promesses : l'utilisateur change son nom, choisit les catégories de notification qu'il veut recevoir, règle thème et langue (déjà livrés) et peut tout effacer d'un geste (« Réinitialiser mes données »). Les onglets de la maquette qui dépendent de features absentes (Portefeuille virtuel, canaux e-mail et navigateur) ne s'affichent pas encore.

## Comment

Profil : `authClient.updateUser({ name })` de better-auth, déjà servi par core-backend (`/api/auth/*`) : ni route ni base à ajouter. Notifications : table `NotificationPreference` dans la base `notifications` (une ligne par utilisateur, un booléen par catégorie, `@default(true)`), exposée par notification-service, relayée par la liste blanche du proxy de core-backend ; le consumer de `notification.requested` n'enregistre pas ce qu'une catégorie désactivée écarte. Réinitialisation : `POST /api/account/reset` de core-backend supprime en transaction les backtests (et leurs allocations et exécutions), portefeuilles et calculs de pricing de l'utilisateur, puis publie `user.data.reset` ; notification-service supprime ses notifications (la base `notifications` n'appartient qu'à lui).

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | Nom modifiable, e-mail affiché en lecture seule. | Changer l'e-mail demande une vérification par courrier ; aucun service d'e-mail n'existe. | `US.md` |
| D2 | Pas de photo de profil : bouton absent, avatar à initiales (déjà dans `nav-user.tsx`). | Aucun stockage de fichiers dans le projet. | `US.md` |
| D3 | Onglet « Portefeuille » absent. | Il configure le paper trading (maquettes 29 et 29.1), feature bonus non planifiée. Ajouté avec elle. | `US.md` |
| D4 | Préférences par catégorie (`BACKTESTS`, `RISK`), pas par type ni par canal. | Les catégories existantes sont celles de la page Notifications ; « alertes de prix », « ordres » et « résumé quotidien » n'ont pas de producteur. | `packages/contracts/src/notification.ts` |
| D5 | Une notification d'une catégorie désactivée n'est ni enregistrée ni diffusée en SSE (pas de ligne masquée). | Évite une liste qui change quand on réactive ; la préférence vaut pour l'avenir. | `US.md` |
| D6 | Canaux « E-mail » et « Navigateur » hors périmètre. | Pas d'envoi d'e-mail ni de push ; la carte disparaît de la maquette. | `US.md` |
| D7 | « Réinitialiser mes données » (carte « Données » de l'onglet Profil, dialog `06.3`) supprime backtests, portefeuilles, calculs de pricing et notifications ; compte, session, rôle et préférences restent. **Irréversible.** | Demande du 2026-11-24. Remplace « Réinitialiser le portefeuille » (29 / 29.1), qui visait le paper trading absent. | `US.md` |
| D8 | Le dialog demande de saisir `RÉINITIALISER` ; le récapitulatif liste les familles supprimées sans compteur. | Évite une route de comptage ; le geste reste protégé. | `681:16073` |
| D9 | Deux propriétaires, un événement : core-backend efface la base `trading` puis publie `user.data.reset` (`userId`) ; notification-service efface sa base. Consommateur idempotent (supprimer deux fois = même état). | « Seul écrivain » de chaque base (`AGENTS.md`). Un calcul encore en vol qui revient après la suppression trouve sa ligne absente : transition gardée, `logger.warn`, aucun crash. | `US.md` |

## Fichiers

- [`US.md`](US.md) — user stories et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
