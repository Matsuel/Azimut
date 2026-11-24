# fix-10 · Paramètres : profil et préférences de notification

- **Statut** : Planifiée
- **Roadmap** : hors roadmap annuelle — terminer la page Paramètres avant la feature 21 (demande du 2026-11-24)
- **Période** : prévue 2026-11-24 → 2026-11-25
- **Branche / PR** : `feat/parametres-profil`
- **Points** : 30 (MUST 13, SHOULD 17) — prévus
- **Maquettes** : `06 · Paramètres · Profil` (node `18:2065`), `06.1 · Paramètres · Notifications` (node `129:2775`), `06.2 · Paramètres · Apparence` (node `129:2996`, déjà codée)
- **Écrans modifiés** : `06 · Paramètres · Profil` (`18:2065`, copie fix-09 `655:15884`) : sans bouton « Changer la photo », e-mail en lecture seule, sans cartes « Portefeuille virtuel » ni « Apparence » (elles ont leur onglet) — à dessiner ; `06.1 · Paramètres · Notifications` (`129:2775`) : deux catégories (Backtests, Risque) au lieu de quatre types, sans carte « Canaux de réception » — à dessiner

## Objectif

La page Paramètres tient ses promesses : l'utilisateur change son nom, choisit les catégories de notification qu'il veut recevoir, et règle thème et langue (déjà livrés). Les onglets de la maquette qui dépendent de features absentes (Portefeuille virtuel, canaux e-mail et navigateur) ne s'affichent pas encore.

## Comment

Profil : `authClient.updateUser({ name })` de better-auth, déjà servi par core-backend (`/api/auth/*`) : ni route ni base à ajouter. Notifications : table `NotificationPreference` dans la base `notifications` (une ligne par utilisateur, un booléen par catégorie, `@default(true)`), exposée par notification-service, relayée par la liste blanche du proxy de core-backend ; le consumer de `notification.requested` n'enregistre pas ce qu'une catégorie désactivée écarte.

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | Nom modifiable, e-mail affiché en lecture seule. | Changer l'e-mail demande une vérification par courrier ; aucun service d'e-mail n'existe. | `US.md` |
| D2 | Pas de photo de profil : bouton absent, avatar à initiales (déjà dans `nav-user.tsx`). | Aucun stockage de fichiers dans le projet. | `US.md` |
| D3 | Onglet « Portefeuille » absent. | Il configure le paper trading (maquettes 29 et 29.1), feature bonus non planifiée. Ajouté avec elle. | `US.md` |
| D4 | Préférences par catégorie (`BACKTESTS`, `RISK`), pas par type ni par canal. | Les catégories existantes sont celles de la page Notifications ; « alertes de prix », « ordres » et « résumé quotidien » n'ont pas de producteur. | `packages/contracts/src/notification.ts` |
| D5 | Une notification d'une catégorie désactivée n'est ni enregistrée ni diffusée en SSE (pas de ligne masquée). | Évite une liste qui change quand on réactive ; la préférence vaut pour l'avenir. | `US.md` |
| D6 | Canaux « E-mail » et « Navigateur » hors périmètre. | Pas d'envoi d'e-mail ni de push ; la carte disparaît de la maquette. | `US.md` |

## Fichiers

- [`US.md`](US.md) — user stories et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
