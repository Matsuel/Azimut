# 28 · Offres et abonnement : plans, facturation et cadre légal

- **Statut** : Planifiée
- **Roadmap** : hors « Roadmap annuelle » — idée du 2026-11-25 (rendre une partie de l'app payante pour un lancement public)
- **Période** : à fixer au démarrage de la feature
- **Branche / PR** : `feat/offres-et-abonnement` — PR à ouvrir
- **Points** : 45 (MUST 42, SHOULD 3) — prévus
- **Maquettes** : aucune pour l'instant, à dessiner avant le code (numéros proposés à partir de 48) : `48 · Paramètres · Abonnement`, `48.1 · Limite de l'offre atteinte (dialog)`, `48.2 · Supprimer mon compte (dialog)`, `48.3 · Pages légales`
- **Écrans modifiés** : `06 · Paramètres` (`18:2065`, copies fix-09 `655:15884` et fix-10 `681:15866`) : nouvel onglet « Abonnement » ; `02 · Inscription` : case d'acceptation des CGU ; pages Risque, Projection et Portefeuille : mention « simulation, pas un conseil » — à dessiner (le cadre exact de chaque écran est à lire dans Figma avant la copie `· à modifier (F28)`)
- **Dépend de** : 27 (portefeuille réel, pour sa limite par offre) et fix-10 (page Paramètres, réinitialisation). Un lancement **public** suppose aussi 24 à 26 (déploiement, observabilité, résilience) : cette feature rend l'application *payable*, pas *déployée*.

## Objectif

L'utilisateur voit son offre (gratuite ou payante), ses limites et son usage ; il passe à l'offre payante par un paiement en ligne, la gère ou la résilie lui-même, et peut supprimer son compte. L'application affiche partout que ses résultats sont des simulations et non du conseil en investissement. C'est le socle d'un lancement au grand public.

## Comment

Le plan est un champ de l'utilisateur, écrit uniquement par `core-backend` à partir de l'état de l'abonnement Stripe. Les limites sont des constantes de `packages/contracts` appliquées par un service de `core-backend` ; le web reçoit le plan, les limites et l'usage de l'API et ne calcule rien. Les moteurs ne changent pas : le risque et la projection sont toujours calculés, c'est la **lecture** qui est limitée (D4). La facturation passe par Stripe Checkout et le portail client ; un webhook signé et idempotent tient le plan à jour (D5, D6). La suppression de compte annule l'abonnement puis réutilise le chemin de la réinitialisation des données de fix-10 (D9).

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | **Contenu des offres** : à trancher (proposition dans `US.md`) | L'utilisateur ne sait pas encore ce qui est payant ; les limites sont des constantes, donc faciles à changer. | `US.md` (à valider) |
| D2 | **Plan stocké sur `User`**, écrit par `core-backend` seul | Un seul propriétaire de la valeur ; lu par les services et par l'API. | `US.md` (à valider) |
| D3 | **Contrôle côté serveur** ; le web affiche | Règle « Responsabilités » : un client ne décide jamais d'un droit. | `US.md` (à valider) |
| D4 | **Calcul toujours exécuté, verrou à la lecture** | Aucun changement de moteur ni de contrat Kafka ; un passage en payant débloque tout de suite. | `US.md` (à valider) |
| D5 | **Facturation Stripe** (Checkout et portail client), plugin Stripe de better-auth si adapté, sinon SDK `stripe` | Réutiliser la dépendance d'authentification déjà installée si elle couvre le besoin ; à vérifier en T-01. | `US.md` (à valider) |
| D6 | **Webhook signé et idempotent** (clé : identifiant d'événement Stripe) | Les webhooks sont rejoués ; même discipline que les consommateurs Kafka. | `US.md` (à valider) |
| D7 | **Comptes existants et dépassements** : tous gratuits au départ, rien n'est supprimé ; une limite bloque la création, pas la lecture de l'existant | Ne pas détruire des données d'utilisateurs qui ont des backtests. | `US.md` (à valider) |
| D8 | **Administrateurs** : limites levées (`hasAdminRole`), sans abonnement | Le rôle existe déjà ; évite de se facturer soi-même. | `US.md` (à valider) |
| D9 | **Suppression de compte** : annulation Stripe, puis suppression des données par le chemin de `user.data.reset` | `notification-service` sait déjà purger ses données sur cet événement. | `US.md` (à valider) |
| D10 | **Cadre légal** : mention « simulation, pas un conseil », CGU et confidentialité acceptées à l'inscription (date stockée), pages légales statiques | Condition d'un lancement public ; le **texte** juridique est à faire relire hors du code. | `US.md` (à valider) |

## Écarts au plan

Aucun (planification).

## Limites à rendre visibles

- Les textes des CGU, de la politique de confidentialité et des mentions sont des **modèles** : un lancement public demande leur relecture par un juriste.
- TVA et statut de facturation (micro-entreprise, société) : à trancher hors du code ; Stripe Tax peut aider mais ne remplace pas la décision.
- Le mode test de Stripe suffit pour développer et pour les E2E ; les clés de production restent hors du dépôt (`env.ts`).

## Bilan

Rétro et clôture seulement.

## Fichiers

- [`US.md`](US.md) — user stories et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
