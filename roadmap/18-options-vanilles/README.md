# 18 · Options vanilles : payoffs et Black-Scholes

- **Statut** : Livrée
- **Roadmap** : Mois 9 — Mois 9 — Options (payoffs, Black-Scholes, grecques, volatilité implicite)
- **Période** : 2026-11-23
- **Branche / PR** : `feat/options-vanilles` — PR #21 (mergée)
- **Points** : 21 (MUST 16, SHOULD 5) — réalisés = prévus
- **Maquettes** : `36 · Calculateur d’option` (créée, node `459:12719`)
- **Écrans modifiés** : `08 · Détail d’un symbole` (node `13:1466`) : bouton « Pricer une option », spot et dividende pré-remplis (T-07) — dessiné dans la copie `à modifier (F18)` ; l’original est mis à jour au codage
- **Dépend de** : 11 (dividendes) ; 17 (taux, pipeline pricing).

## Objectif

L'utilisateur calcule le prix d'un call ou d'un put et voit son payoff. Ces deux objets sont la brique « billet de loto » d'un produit structuré.

## Comment

Moteur : `options.ts`, Black-Scholes et payoffs purs. Pas de chaîne d'options (D5). Demande via le pipeline pricing de 15, instrument `OPTION`. Web : calculateur.

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | **Modèle** : Black-Scholes, européen, dividende continu q | Modèle de référence du cours. Dividendes discrets (ajustement du forward) reportés. | `US.md` (à valider) |
| D2 | **Volatilité** : Saisie par l'utilisateur, pré-remplie avec la volatilité historique | La volatilité implicite est traitée en 19 ; une valeur Yahoo brute n'est pas une source de vérité. | `US.md` (à valider) |
| D3 | **Options américaines** : Hors périmètre | Exercice anticipé : pas en MVP (voir README, COULD). | `US.md` (à valider) |
| D4 | **Pré-remplissage** : volatilité historique sur 1 an (annualisée, 252 jours ouvrés) et taux US 3 mois, tous deux modifiables | Une seule fenêtre : pas de sélecteur à coder ni tester. | Décision du 2026-11-14 |
| D5 | **Chaîne d'options** : absente de la 18, la route arrive en 19 avec le filtre de qualité | Évite d'afficher une chaîne brute incohérente avant son filtre. Le calculateur est 100 % saisi. | Décision du 2026-11-14 ; T-03 déplacée en 19 (T-08) |
| D6 | **Discriminant** : `kind` (`BOND`, `OPTION`), pas `instrument` ; backend livré d'abord, puis écran T-07 et route de préremplissage (D7) | Le code de 17 fait foi : `kind` est déjà l'enum base et le contrat. La grille de payoff (achat, prime déduite) est calculée par le moteur. | Spec feature 18 (backend), 2026-11-23 |
| D7 | **Préremplissage** : `GET /api/market/option-inputs?symbol=` de market-service (spot via `quote`, volatilité 1 an et rendement du dividende 12 mois via un seul `chart` avec `events: "div"`), jamais en cache, relayée par le proxy ; le taux 3 mois vient de la courbe déjà lue (`^IRX`), pas de la route. Symbole inconnu : `404 SYMBOL_NOT_FOUND`, champs laissés vides côté web. Maturité saisie en jours (182 j = 182 / 365 an). `parityVerified` (booléen, tolérance 1e-6 portée par le moteur, optionnel pour un résultat antérieur : `<Dash />`) ajouté au résultat d'option ; le web l'affiche. Onglets « Grecques et smile » et « Pricing Monte Carlo » de la maquette absents. | Le web ne décide aucun verdict. Pas de chaîne d'options (D5). | Spec feature 18 (page Options), 2026-11-23 |

## Écarts au plan

Aucun sur le périmètre. Un code d'erreur `SYMBOL_NOT_FOUND` et un champ `OptionInputs` du contrat `market` s'ajoutent à ceux prévus (D7).

## Bilan

- **Livré** : les 6 tâches (21 points ; T-03 déplacée en 19). Engine Black-Scholes à dividende continu, payoffs et parité, contrat et pipeline `pricing.*` pour les options, worker, page `36 · Calculateur d'option`, bouton « Pricer une option » du détail d'un symbole.
- **Écarts** : voir « Écarts au plan ».
- **Dette** : voir `TECH-DEBT.md`.

## Fichiers

- [`US.md`](US.md) — user stories et critères d’acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
