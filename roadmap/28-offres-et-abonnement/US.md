# 28 · Offres et abonnement : plans, facturation et cadre légal — User stories

> Sources : idée du 2026-11-25 (rendre une partie de l'app payante), `roadmap/fix-10-parametres-profil/` (page Paramètres, réinitialisation), `roadmap/27-portefeuille-reel/` (limite de portefeuilles), `roadmap/14-projection-monte-carlo/` (horizon de projection). Aucune maquette n'existe encore : les écrans sont à dessiner avant le code (`apps/web/AGENTS.md`, « Maquette d'abord »).

## Point de départ

| Couche | Existant | Manque |
| --- | --- | --- |
| `prisma/schema.prisma` | `User` (`role`, `banned`), tables better-auth | `User.plan`, identifiants et état d'abonnement, `termsAcceptedAt`, table des événements Stripe traités |
| `core-backend` | better-auth (`auth.controller.ts`), `AccountService` (`POST /api/account/reset`, publie `user.data.reset`), `ProjectionService` (mappe l'entrée en DTO), `RiskService` | Service de plan et de limites, routes plan / paiement / portail / suppression / export, webhook Stripe |
| `packages/contracts` | `API_ERROR_CODES`, `ProjectionView`, `notification.requested` | `PLANS`, `PLAN_LIMITS`, `PlanView`, code `PLAN_LIMIT` |
| `packages/http` | `AppError`, `ForbiddenError`, `BadRequestError` | Rien : le dépassement de limite est une `ForbiddenError` avec un code dédié |
| `packages/utils` | `hasAdminRole` (`@azimut/utils/roles`) | Rien : réutilisé pour lever les limites (D8) |
| `apps/web` | Page Paramètres (`features/settings` : Profil, Notifications, Apparence, Portefeuille grisé), formulaire d'inscription (`features/auth`), pages Risque et Projection | Onglet Abonnement, états verrouillés, mention « simulation », pages légales, case CGU, dialog de suppression de compte |
| Facturation, légal | Aucun | Stripe (clés dans `env.ts`), webhook, pages légales |

## Hors périmètre

- **Déploiement public** (CI/CD, Kubernetes, observabilité, résilience) : features 23 à 26.
- **Connexion bancaire** payante : feature ultérieure (agrégateur), elle s'insérera dans les limites de l'offre.
- **Plusieurs offres payantes, coupons, essai gratuit, facturation annuelle** : une seule offre payante mensuelle au départ.
- **Facturation d'entreprise, TVA détaillée, factures personnalisées** : portail client Stripe seulement.
- **Gestion des plans par un administrateur** (page Utilisateurs) : extension COULD.
- **Texte juridique définitif** : modèles à faire relire.

## Décisions à valider

| # | Sujet | Proposition | Raison |
| --- | --- | --- | --- |
| D1 | Contenu des offres | Gratuit : 1 portefeuille, projection affichée jusqu'à 5 ans, 10 backtests. Payant : 10 portefeuilles, projection jusqu'à 30 ans, backtests illimités. **À trancher** : quelles métriques de la page Risque sont « avancées » (non couvert par ces trois limites) ; prix de l'offre. | L'utilisateur a désigné « projections et risque avancés » comme payants sans en dire plus ; ces trois limites sont mesurables dès aujourd'hui. Les valeurs sont des constantes de `PLAN_LIMITS`. |
| D2 | Stockage du plan | `User.plan` (`FREE` ou `PRO`, défaut `FREE`) plus identifiants Stripe ; écrit seulement par `core-backend`. | Propriétaire unique de la valeur. |
| D3 | Contrôle | Un service de `core-backend` applique les limites ; dépassement : `ForbiddenError` avec le code `PLAN_LIMIT` et la limite en paramètre. Le web affiche l'erreur traduite. | Un droit ne se décide pas dans le client. |
| D4 | Verrou à la lecture | Le risque et la projection restent calculés pour tous ; `ProjectionService` retire les points au-delà de l'horizon du plan. Le web gère déjà un nombre d'horizons variable (feature 14, D14). | Pas de nouvel événement, pas de recalcul à l'upgrade. |
| D5 | Facturation | Stripe Checkout (abonnement mensuel) et portail client ; plugin Stripe de better-auth si son modèle d'abonnement et ses webhooks conviennent, sinon SDK `stripe` dans `core-backend`. | « Utiliser la dépendance installée d'abord » ; à trancher en T-01 sur le code du plugin, pas sur un souvenir. |
| D6 | Webhook | Route recevant le corps brut, signature vérifiée, événements traités une seule fois (table indexée par l'identifiant d'événement), transitions de plan gardées par état. | Les webhooks sont rejoués dans le désordre ; même principe que les consommateurs Kafka. |
| D7 | Existant | Les comptes actuels passent `FREE`. Un compte au-dessus d'une limite garde ses données ; seule la création est bloquée. | Aucune suppression silencieuse. |
| D8 | Administrateurs | `hasAdminRole` donne les limites de l'offre payante sans abonnement. | Rôle déjà en place. |
| D9 | Suppression de compte | Annule l'abonnement Stripe, publie `user.data.reset`, puis supprime l'utilisateur (cascade). Une annulation Stripe en échec **bloque** la suppression et l'indique. | Ne pas laisser un client facturé sans compte. |
| D10 | Légal | Case CGU et confidentialité à l'inscription, `termsAcceptedAt` stocké ; composant unique `SimulationDisclaimer` sur Risque, Projection, Portefeuille et résultat de backtest ; pages `/legal/terms` et `/legal/privacy` statiques. | Un composant, une source de texte (`messages/`). |

---

## User stories

### Lot 1 — Intégration et droits

#### US-01 · Voir mon offre, mes limites et mon usage — MUST

**En tant qu'** utilisateur, **je veux** voir mon offre, ses limites et ce que j'en ai consommé **afin de** savoir ce que je peux encore faire.

Critères d'acceptation :
- [ ] L'onglet Abonnement des Paramètres affiche l'offre, les limites et l'usage (portefeuilles, backtests, horizon de projection), tous reçus de l'API.
- [ ] Aucune limite n'est écrite en dur dans le web ; les textes sont dans `messages/` en FR et EN.
- [ ] Un administrateur voit les limites de l'offre payante.

Tâches : T-02, T-05, T-07.

#### US-02 · Limites de l'offre gratuite appliquées — MUST

**En tant qu'** utilisateur de l'offre gratuite, **je veux** savoir clairement quand je touche une limite **afin de** décider de passer à l'offre payante.

Critères d'acceptation :
- [ ] Créer un portefeuille ou un backtest au-delà de la limite répond `403` avec le code `PLAN_LIMIT` et la limite ; rien n'est créé.
- [ ] La projection renvoie seulement les horizons permis par le plan ; les onglets d'horizon du web suivent sans calcul ajouté.
- [ ] Un compte déjà au-dessus d'une limite garde ses données et peut les lire.
- [ ] L'écran de la limite propose de passer à l'offre payante.

Tâches : T-04, T-08, T-12.

### Lot 2 — Facturation

#### US-03 · Passer à l'offre payante — MUST

**En tant qu'** utilisateur, **je veux** payer l'abonnement en ligne **afin de** lever les limites.

Critères d'acceptation :
- [ ] Le bouton crée une session Stripe Checkout et redirige vers elle ; l'utilisateur ne quitte jamais son compte sans retour possible.
- [ ] Après le paiement, le plan passe à `PRO` (par le webhook, US-05) et l'écran le montre sans recharger à la main.
- [ ] Un paiement annulé laisse le plan inchangé.

Tâches : T-01, T-03, T-05, T-07, T-12.

#### US-04 · Gérer ou résilier mon abonnement — MUST

**En tant qu'** abonné, **je veux** modifier mon moyen de paiement, voir mes factures et résilier **afin de** garder la maîtrise de mon abonnement.

Critères d'acceptation :
- [ ] Un bouton ouvre le portail client Stripe ; le retour ramène sur l'onglet Abonnement.
- [ ] Après résiliation, le plan repasse à `FREE` à la fin de la période payée (par le webhook).
- [ ] Un utilisateur gratuit n'a pas ce bouton.

Tâches : T-05, T-07.

#### US-05 · Plan fidèle au paiement — MUST

**En tant que** propriétaire du produit, **je veux** que le plan suive exactement l'état de l'abonnement Stripe **afin de** ne jamais donner ni retirer un droit par erreur.

Critères d'acceptation :
- [ ] Le webhook refuse une signature invalide (`400`, rien n'est écrit).
- [ ] Un même événement rejoué n'a d'effet qu'une fois.
- [ ] Les événements arrivant dans le désordre ne ramènent pas un plan à un état ancien.
- [ ] Un paiement échoué ou un abonnement impayé retire le plan payant selon l'état renvoyé par Stripe.
- [ ] Tests : événements d'activation, de renouvellement, d'échec, d'annulation, rejoués et inversés.

Tâches : T-06.

### Lot 3 — Cadre légal et données personnelles

#### US-06 · Mentions légales et CGU — MUST

**En tant qu'** utilisateur, **je veux** lire les conditions et savoir que les résultats sont des simulations **afin de** ne pas prendre un calcul pour un conseil.

Critères d'acceptation :
- [ ] L'inscription exige la case CGU et confidentialité ; la date d'acceptation est enregistrée.
- [ ] La mention « simulation, pas un conseil en investissement » s'affiche sur Risque, Projection, Portefeuille et résultat de backtest, par un composant unique.
- [ ] Les pages `/legal/terms` et `/legal/privacy` sont accessibles sans compte.
- [ ] Les textes existent en FR et EN dans `messages/`.

Tâches : T-03, T-09, T-12.

#### US-07 · Supprimer mon compte — MUST

**En tant qu'** utilisateur, **je veux** supprimer mon compte et mes données **afin d'**exercer mon droit à l'effacement.

Critères d'acceptation :
- [ ] Un dialog demande une confirmation explicite (saisie de l'e-mail).
- [ ] L'abonnement Stripe est annulé d'abord ; s'il échoue, le compte n'est pas supprimé et l'erreur est affichée.
- [ ] Backtests, portefeuilles, notifications et préférences sont supprimés (`user.data.reset`), puis le compte et la session.
- [ ] Un test vérifie qu'aucune ligne de l'utilisateur ne subsiste dans la base `trading`.

Tâches : T-10, T-12.

#### US-08 · Exporter mes données — SHOULD

**En tant qu'** utilisateur, **je veux** télécharger mes données **afin d'**exercer mon droit à la portabilité.

Critères d'acceptation :
- [ ] Un bouton télécharge un fichier JSON (profil, portefeuilles et positions, backtests avec leurs paramètres).
- [ ] L'export ne contient que les données de l'utilisateur connecté.

Tâches : T-11.

---

## Récapitulatif

| US | Titre | Priorité | Lot | Couches |
| --- | --- | --- | --- | --- |
| US-01 | Voir mon offre et mon usage | MUST | 1 | contracts, core-backend, web |
| US-02 | Limites de l'offre gratuite | MUST | 1 | core-backend, web |
| US-03 | Passer à l'offre payante | MUST | 2 | core-backend, web |
| US-04 | Gérer ou résilier | MUST | 2 | core-backend, web |
| US-05 | Plan fidèle au paiement | MUST | 2 | core-backend |
| US-06 | Mentions légales et CGU | MUST | 3 | core-backend, web |
| US-07 | Supprimer mon compte | MUST | 3 | core-backend, web |
| US-08 | Exporter mes données | SHOULD | 3 | core-backend, web |
