# 27 · Portefeuille réel : positions, import et analyse

- **Statut** : Planifiée
- **Roadmap** : hors « Roadmap annuelle » — idée du 2026-11-25 (agrégateur de comptes, volet « portefeuille réel »)
- **Période** : à fixer au démarrage de la feature
- **Branche / PR** : `feat/portefeuille-reel` — PR à ouvrir
- **Points** : 50 (MUST 47, SHOULD 3) — prévus
- **Maquettes** : aucune pour l'instant, à dessiner avant le code (numéros proposés à partir de 47) : `47 · Portefeuilles (liste)`, `47.1 · Portefeuille · positions`, `47.2 · Ajouter une position (dialog)`, `47.3 · Importer un relevé (dialog)`
- **Écrans modifiés** : sidebar (`constants/sidebar.tsx`, entrée « Portefeuille ») — à dessiner ; point d'entrée vers les pages Risque et Projection depuis un portefeuille — à trancher (US-05)
- **Dépend de** : 13 (risque), 14 (projection) et 11 (taux de change) livrées. Prépare 28 (limites par offre).

## Objectif

L'utilisateur décrit son vrai portefeuille (par exemple un PEA avec trois ETF : symbole, quantité, prix de revient), en saisie ou par import d'un relevé CSV, et le laboratoire travaille directement dessus : valeur actuelle, poids, risque et projection Monte Carlo. Il n'a plus à reconstruire à la main une allocation de backtest pour savoir où il en est.

## Comment

Le portefeuille réel est un nouveau jeu de données de `core-backend`, pas un nouveau moteur. Le modèle `Portfolio` existant (conteneur par utilisateur, hérité du paper trading) reçoit des `PortfolioPosition`. La valeur et les poids sont calculés par un service de `core-backend` avec le `MarketClient` (cours et change de la feature 11). L'**analyse** crée un `Backtest` à partir des poids actuels et de la valeur actuelle (D5) : le backtest, le risque et la projection existants se déclenchent sans changement de moteur ni de contrat Kafka. Le web affiche les valeurs reçues.

Une position porte sa `source` (`MANUAL` ou `IMPORT`). Une source `AGGREGATOR` (connexion bancaire DSP2) viendra dans une feature ultérieure ; le modèle n'a rien à changer pour l'accueillir, seule l'énumération s'étend.

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | **Modèle** : réutiliser `Portfolio` et ajouter `PortfolioPosition` ; `TradingAccount` reste pour le paper trading | Évite un second conteneur ; la réinitialisation des données (fix-10) supprime déjà les portefeuilles, les positions suivent en cascade. | `US.md` (à valider) |
| D2 | **Position** : symbole, quantité, prix de revient optionnel, ISIN conservé s'il vient de l'import, source ; 50 positions au plus | Le minimum pour valoriser et calculer la plus-value. | `US.md` (à valider) |
| D3 | **ISIN** : résolu par la recherche de `market-service` si Yahoo le permet ; un ISIN non résolu rejette la ligne, jamais deviné | Un mauvais mapping fausserait le portefeuille ; vérification en T-03. | `US.md` (à valider) |
| D4 | **Valorisation côté backend** (`MarketClient`, EUR via la feature 11) ; poids arrondis au pourcent | `BacktestAllocation.weight` est `Decimal(3,2)` (feature 08, D2) ; le web n'affiche que ce que l'API renvoie. | `US.md` (à valider) |
| D5 | **Analyse = un backtest créé depuis le portefeuille** (poids actuels appliqués à l'historique) | Risque et projection existent déjà et partent d'un backtest ; zéro nouveau moteur. | `US.md` (à valider) |
| D6 | **Lien analyse → portefeuille** : `Backtest.portfolioId` nullable | Retrouver la dernière analyse ; champ nullable pour les backtests existants. | `US.md` (à valider) |
| D7 | **Historique court** : comportement de la feature 12, aucune règle ajoutée | Pas de seconde règle à maintenir. | `US.md` (à valider) |

## Écarts au plan

Aucun (planification).

## Bilan

Rétro et clôture seulement.

## Fichiers

- [`US.md`](US.md) — user stories et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
