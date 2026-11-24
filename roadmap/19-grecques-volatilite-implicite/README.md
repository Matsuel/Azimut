# 19 · Grecques, volatilité implicite et smile

- **Statut** : Livrée
- **Roadmap** : Mois 9 — Mois 9 — Options (grecques, volatilité implicite, smile et surface)
- **Période** : 2026-11-23 → 2026-11-24
- **Branche / PR** : `feat/grecques-volatilite-implicite` — PR vers `develop`
- **Points** : 27 (MUST 22, SHOULD 5) — réalisés = prévus
- **Maquettes** : `37 · Grecques et smile` (créée, node `461:12922`)
- **Écrans modifiés** : `36 · Calculateur d’option` (node `459:12719`) : bouton « Volatilité implicite » vers la page 37 — dessiné dans la copie `à modifier (F19)` ; l’original est mis à jour au codage
- **Dépend de** : 18 (options vanilles).

## Objectif

L'utilisateur voit ce que le marché anticipe (volatilité implicite), comment le prix réagit (grecques), et pourquoi le modèle de base est imparfait (smile). C'est le tableau de bord du structureur.

## Comment

Moteur : inversion de Black-Scholes et grecques (fonctions pures). Filtre de qualité avant tout calcul. Chaîne calculée par le worker via le pipeline pricing. Web affiche.

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | **Volatilité implicite** : Calculée par le moteur (bisection) | Les données Yahoo sont incohérentes : sur SPY, 91 contrats sur 220 ont une IV nulle ou aberrante (14 juil. 2026, séance non confirmée). | `US.md` (à valider) |
| D2 | **Filtre** : Prix nul, bid/ask nuls, IV hors [1 %, 300 %] écartés et comptés | Un filtre visible vaut mieux qu'un nettoyage silencieux. | `US.md` (à valider) |
| D3 | **Surface** : Smile 2D par échéance, pas de surface 3D | Une courbe par échéance suffit pour voir le smile ; la 3D est coûteuse à lire et à tester. | `US.md` (à valider) |
| D4 | **Smile** : 3 échéances, options hors de la monnaie (puts sous le spot, calls au-dessus) | Les plus liquides : volatilité implicite la moins bruitée. | Décision du 2026-11-14 |
| D5 | **Route de chaîne** : créée en 19 (T-08, reprise de T-03 de la 18) | La 18 n'affiche pas de chaîne (18 D5). | Décision du 2026-11-14 |
| D6 | **Volatilité historique 30 jours** : calculée par le worker (écart-type annualisé des rendements des 30 derniers jours de bourse, `historicalVolatility` de `packages/utils`), publiée avec la chaîne ; l'écart à l'IV ATM (`volatilityPremium`, en points) l'est aussi | La maquette 37 affiche la carte « Vol. historique 30 j » (+3,2 pts) ; le web n'additionne pas de valeurs métier. | Décision du 2026-11-23 |
| D7 | **Demande de chaîne** : nouveau `kind` `OPTION_CHAIN` du pipeline `pricing.*` (migration de l'enum `PricingKind`), saisie = un symbole. Le worker lit chaîne, entrées d'option, taux et cours auprès de market-service ; 3 échéances à au moins 14 jours ; taux = point le plus court de la courbe US, commun à toutes les échéances ; chaîne détaillée = première échéance ; contrats comptés sur les 3 échéances | Réutilise le pipeline de la 18 (résultat stocké en JSON, aucune table). Route `GET /api/market/options` interne (non relayée au web). | Décision du 2026-11-23 |

## Écarts au plan

D6 et D7 ajoutées en cours de route (volatilité historique 30 j de la maquette 37 ; demande de chaîne `OPTION_CHAIN`). Pagination (10 lignes) et infobulles `InfoHint` ajoutées à la grille de payoff et à la chaîne.

## Bilan

- **Livré** : les 8 tâches (27 points). Engine (`impliedVolatility` par bisection, grecques, filtre de qualité, smile, prime de volatilité), route `GET /api/market/options` de market-service, `MarketClient`, kind `OPTION_CHAIN` (migration de `PricingKind`), page `37 · Grecques et smile`, onglets Options, glossaire, catalogues, E2E avec faux market-service d'options.
- **Écarts** : voir « Écarts au plan ».
- **Dette** : TD-63 ouverte (taux unique, devise USD supposée, pas de sélecteur d'échéance, maquette 37 non validée explicitement). Mesure visuelle contre la maquette 37 (`verifier-rendu`) et exécution des E2E non faites dans cette passe. Services à redémarrer : core-backend (migration `PricingKind` à appliquer), market-service, backtest-engine.

## Fichiers

- [`US.md`](US.md) — user stories et critères d’acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
