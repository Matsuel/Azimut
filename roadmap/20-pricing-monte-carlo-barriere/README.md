# 20 · Pricing Monte Carlo et option à barrière

- **Statut** : Livrée
- **Roadmap** : Mois 10 — Mois 10 — Pricing et produits structurés (Monte Carlo validé contre Black-Scholes, option à barrière)
- **Période** : 2026-11-24
- **Branche / PR** : `feat/20-pricing-monte-carlo-barriere` — PR vers `develop`
- **Points** : 22 (MUST 19, SHOULD 3) — réalisés = prévus
- **Maquettes** : `38 · Pricing Monte Carlo` (créée, node `462:13129`)
- **Écrans modifiés** : `36 · Calculateur d’option` (node `459:12719`) : bouton « Pricing Monte Carlo » vers la page 38 — dessiné dans la copie `à modifier (F20)` ; l’original est mis à jour au codage
- **Dépend de** : 14 (moteur Monte Carlo, PRNG) ; 18 (Black-Scholes sert de référence).

## Objectif

L'utilisateur price une option par simulation et voit pourquoi cette méthode est indispensable dès qu'il n'existe pas de formule. Les options à barrière sont la brique des produits structurés.

## Comment

Moteur : trajectoires GBM réutilisant le PRNG de 14, prix moyen actualisé, barrière surveillée chaque jour. Demande via le pipeline pricing (kind `OPTION_MC`, D5). Web affiche prix, erreurs standard, convergence et comparaison à Black-Scholes.

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | **Dynamique** : GBM sous mesure neutre au risque (dérive r − q) | Standard pour le pricing ; le bootstrap de 14 sert à la projection, pas au pricing. | `US.md` (à valider) |
| D2 | **Barrière** : Surveillance quotidienne | Les barrières réelles sont souvent observées à la clôture ; une surveillance continue sous-estime le risque de dépassement. | `US.md` (à valider) |
| D3 | **Validation** : Écart inférieur à 3 erreurs standard vers Black-Scholes | Critère statistique, pas un seuil arbitraire en euros. | `US.md` (à valider) |
| D4 | **Trajectoires** : 100 000 par défaut, réglable de 10 000 à 1 000 000 ; seed fixe stockée avec le résultat | Résultat rejouable ; le réglage montre la convergence de l'erreur standard. | Décision du 2026-11-14 |
| D5 | **Demande** : nouveau `kind` `OPTION_MC` du pipeline `pricing.*` (migration de l'enum `PricingKind`) à la place d'un champ `method` | Le résultat Monte Carlo (trois produits, convergence, trajectoires) n'a pas la forme de `OPTION` ; un kind garde les unions discriminées sans champ optionnel. | Décision du 2026-11-24 |
| D6 | **Trois produits sur les mêmes trajectoires** : une demande price le call vanille, le knock-out et le knock-in ; direction de la barrière déduite du spot (sous le spot : basse, au-dessus : haute ; égale : refusée) ; call seulement | Même tirage : knock-out + knock-in = vanille exactement (test) ; la maquette 38 montre les quatre prix ensemble. | Décision du 2026-11-24 |
| D7 | **Seed fixe 42, pas de champ Seed** (D4 prime sur la maquette 38) : elle est constante du worker (`MONTE_CARLO_SEED`), publiée dans le résultat et affichée dans l'en-tête ; pas de bascule Vanille / KO / KI ni de bascule de méthode dans le formulaire (les onglets de page changent de méthode, les trois produits sont toujours pricés) | Une graine saisie contredit D4 ; une bascule de produit n'a plus d'objet quand les trois sont calculés. | Décision du 2026-11-24 |
| D8 | **Pas journalier, maturité bornée à 1 an** : un pas par jour calendaire (`round(maturité × 365)`) ; 1 000 000 de trajectoires sur 1 an durent ~16 s de calcul bloquant, sous la session Kafka (30 s) ; à 2 ans, 33 s mesurés | Surveillance quotidienne de D2, même année de 365 jours que le calculateur (18). | Décision du 2026-11-24 |
| D9 | **PRNG partagé** : `mulberry32` quitte risk-engine pour `packages/utils` (`random.ts`, avec `standardNormal` Box-Muller) ; risk-engine l'importe de là | « Réutilise le PRNG de 14 » (T-01) sans import relatif entre apps. | Décision du 2026-11-24 |

## Écarts au plan

D5 à D9 ajoutées en cours de route : kind `OPTION_MC` plutôt que le champ `method` de T-05, trois produits par demande, graine non saisissable (la maquette 38 montre un champ Seed), maturité bornée à 1 an, PRNG déplacé dans `packages/utils`.

## Bilan

- **Livré** : les 7 tâches (22 points). `priceOptionMonteCarlo` (GBM neutre au risque, barrière quotidienne, call vanille, knock-out et knock-in sur les mêmes trajectoires, erreur standard, convergence à 1/5/10/50/100 % des trajectoires, 20 trajectoires d'illustration), kind `OPTION_MC` (migration `PricingKind`), page `38 · Pricing Monte Carlo` en troisième onglet des pages Options et bouton sur le calculateur, glossaire (4 entrées), catalogues, E2E.
- **Écarts** : voir « Écarts au plan ».
- **Dette** : TD-64 ouverte. Mesure visuelle contre la maquette 38 (`verifier-rendu`), mise à jour de l'original du cadre 36 dans Figma et exécution des E2E non faites dans cette passe. Services à redémarrer : core-backend (migration `PricingKind` à appliquer), backtest-engine, risk-engine (le PRNG vient de `packages/utils`).

## Fichiers

- [`US.md`](US.md) — user stories et critères d’acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
