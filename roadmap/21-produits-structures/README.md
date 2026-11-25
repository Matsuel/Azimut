# 21 · Produits structurés : décomposition, juste valeur, marge

- **Statut** : Livrée
- **Roadmap** : Mois 10 — Mois 10 — Pricing et produits structurés (capital garanti, reverse convertible, autocallable, juste valeur et marge)
- **Période** : 2026-11-25
- **Branche / PR** : `feat/21-produits-structures` — PR vers `develop`
- **Points** : 29 (MUST 29, SHOULD 0) — réalisés = prévus
- **Maquettes** : `39 · Constructeur de produit` (créée, node `465:13338`, état Capital garanti) ; états `· Reverse convertible` (node `689:16456`) et `· Autocallable` (node `689:16894`) dessinés et validés le 2026-11-25
- **Écrans modifiés** : aucun (page `Structuration` de la sidebar existante)
- **Dépend de** : 17 (obligation), 19 (grecques, IV), 20 (Monte Carlo, barrière).

## Objectif

L'utilisateur assemble un produit structuré à partir de briques, voit sa décomposition, sa juste valeur et la marge de celui qui le vend. C'est l'objectif central du projet pour le métier de structureur.

## Comment

Moteur : produits comme assemblages de briques (`structured.ts`) ; autocallable par Monte Carlo (`structured-mc.ts`). Contrat décomposé, persistance côté core-backend, affichage web sans calcul.

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | **Types livrés** : Capital garanti, reverse convertible, autocallable | Les trois couvrent zéro-coupon, vente de put et barrière. Worst-of reporté (COULD). | `US.md` (à valider) |
| D2 | **Participation** : Calculée par le moteur : budget d'option divisé par le prix du call | Formule simple et lisible : elle montre le compromis garantie / participation. | `US.md` (à valider) |
| D3 | **Autocallable** : Monte Carlo avec dates d'observation | Un autocallable n'a pas de formule fermée. | `US.md` (à valider) |
| D4 | **Marge** : Prix client − juste valeur, en devise et en % | Affiche la rémunération sans la faire passer pour un conseil. Hypothèses de financement et de couverture non incluses. | `US.md` (à valider) |
| D5 | **Prix client** : nominal à 100 %, marge = 100 % − juste valeur | Aucune saisie en plus ; lecture simple. | Décision du 2026-11-14 |
| D6 | **Autocallable** : observation annuelle, rappel si le sous-jacent est ≥ 100 % du niveau initial (coupon cumulé), barrière de protection 60 % à l'échéance, 5 ans ; niveaux modifiables | Cas d'école de la structuration ; les niveaux modifiables montrent l'effet de la barrière sur la juste valeur. | Décision du 2026-11-14 |
| D7 | **D5 prime sur la maquette 39** : le champ « Prix client » est supprimé des trois formulaires (le prix client est une constante, 100 % du nominal, pas une entrée) et reste affiché dans la carte de statistique et le tableau de décomposition ; le graphe de payoff à l'échéance est calculé par l'engine (courbe du produit et du sous-jacent) et affiché tel quel | La maquette montre un champ saisissable et un graphe absent de `TASKS.md` ; D5 écrite le 2026-11-14 prime, le graphe est ajouté au périmètre. | Décision du 2026-11-25 |
| D8 | **Pipeline pricing, pas de table dédiée** : un nouveau `kind` `STRUCTURED` du pipeline `pricing.*` (migration de l'enum `PricingKind`, comme `OPTION_MC` en F20 D5) remplace `StructuredProduct` et `routes/structured/` de T-05 ; « Enregistrer » conserve le résultat dans l'historique des calculs existant | Même flux Kafka et même table de résultats que 17 à 20 : pas de seconde persistance. | Décision du 2026-11-25 |
| D9 | **États Reverse convertible et Autocallable dessinés dans Figma avant leur code** (copies du cadre 39 dans la même section) ; le code d'un état attend son cadre | Seul l'état Capital garanti existait ; `apps/web/AGENTS.md` bloque un écran sans cadre. | Décision du 2026-11-25 |
| D10 | **Conventions de calcul** : produit calculé en pourcentage du niveau initial (le cours n'entre pas dans le prix, pas de dividende, `underlying` n'est qu'un libellé) ; taux annuel composé pour le zéro-coupon et les coupons, converti en continu (`ln(1 + r)`) pour Black-Scholes ; marge de structuration du capital garanti = constante `STRUCTURING_MARGIN` (4 % du nominal, hypothèse pédagogique) : budget d'option = nominal − zéro-coupon − marge, d'où participation = budget ÷ prix du call (D2) ; reverse convertible et autocallable : marge = 100 % − juste valeur, négative si le coupon est trop généreux ; autocallable : un tirage par année (GBM exact), briques = zéro-coupon + « coupons nets » par différence, graine 42 | La maquette 39 chiffrait une marge de 3,76 % sans la saisie correspondante ; les valeurs des cadres 39 sont des exemples, pas des sorties du moteur. | Décision du 2026-11-25 |
| D11 | **Sous-jacent comme en salle de marché** : n'importe quel symbole (recherche `SymbolPicker`), dont la volatilité 1 an, le rendement du dividende et le taux à 5 ans préremplissent le formulaire (`option-inputs`, courbe US) et restent modifiables ; le contrat porte `dividendYield` (le produit ne perçoit pas les dividendes : ils abaissent le forward, donc le prix du call, la prime du put et la dérive de l'autocallable) ; le cours n'entre pas dans le prix (produit en % du niveau initial) | Remplace la liste fixe de trois indices ; même source de marché que le calculateur d'options (18). | Décision du 2026-11-25 |

## Écarts au plan

D7 à D10 ajoutées en cours de route : prix client constant (champ supprimé), kind `STRUCTURED` du pipeline pricing à la place d'une table et de routes dédiées, états Reverse convertible et Autocallable dessinés avant leur code, conventions de calcul dont la marge de structuration fixe du capital garanti. Un graphe de payoff, absent de `TASKS.md`, est ajouté.

## Bilan

- **Livré** : les 7 tâches (29 points). Moteur (`structured.ts`, `structured-mc.ts`), contrat `structured.ts` et kind `STRUCTURED` (migration de l'enum `PricingKind`), page Structuration à trois états (cartes, formulaire, décomposition, payoff, dates d'observation de l'autocallable), glossaire, catalogues.
- **Écarts** : voir « Écarts au plan » ; écarts de la page à la maquette 39 listés dans TD-69 (pas de bouton « Enregistrer », maturité saisie en années, barre en deux blocs pour RC et AC).
- **Dette** : TD-69 ouverte. Mesure `verifier-rendu` contre les trois cadres et E2E (`structured.e2e.ts`, Docker) non faites. Services à redémarrer après merge : core-backend (migration `PricingKind` à appliquer) et backtest-engine.

## Fichiers

- [`US.md`](US.md) — user stories et critères d’acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
