# 13 · Risk Engine — Tâches

> Décisions : `README.md` (D1 à D22) ; calculs et jeux de test : `US.md`. Échelle de points, statuts et définition de terminé commune : [`roadmap/README.md`](../README.md). Points prévus. Écran : [`MAQUETTE.md`](MAQUETTE.md).

## Synthèse

| Tâche | Titre | US | Couche | Priorité | Points | Dépend de | Réalisé | Commits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | Engine : matrice de corrélation | US-01 | risk-engine | MUST | 3 | — | 3 | `042ee3b` |
| T-02 | Engine : VaR et CVaR historiques à 95 %, historique minimal | US-02 | risk-engine | MUST | 5 | — | 5 | `042ee3b` |
| T-03 | Engine : contribution au risque et concentration | US-01 | risk-engine | MUST | 5 | T-01 | 5 | `042ee3b` |
| T-10 | Service risk-engine : création et branchement Kafka | US-01, US-02 | risk-engine | MUST | 5 | T-01, T-02, T-03, T-04 | 8 | `042ee3b`, `5ad17f3` |
| T-04 | Contrat : résultat de risque, seuil et erreurs | US-01, US-02, US-03 | contracts | MUST | 3 | — | 5 | `042ee3b`, `e99b070` |
| T-05 | Stockage du risque, seuil et évaluation de la contrainte | US-02, US-03 | core-backend | MUST | 8 | T-04, T-10 | 8 | `e99b070`, `c4aa35e` |
| T-06 | Page Risque et bouton depuis le résultat | US-01, US-02 | web | SHOULD | 5 | T-04, T-05 | 8 | `8643c18` |
| T-07 | Contrainte de drawdown : saisie et tableau | US-03 | web | SHOULD | 3 | T-05, T-06 | 3 | `8643c18` |
| T-08 | Catalogue API et composants | US-03 | docs | SHOULD | 1 | T-05, T-06 | 1 | `e99b070`, `8643c18` |
| T-09 | Page Risque : route, sélecteur et états | US-04 | web | SHOULD | 4 | T-05, T-06 | 4 | `8643c18`, `c4aa35e` |

**Total** : 42 points prévus — MUST 29, SHOULD 13 ; 50 réalisés (estimés d'après le diff).

Écarts réalisés : T-10 5 → 8, extraction de `packages/market-client` et des briques communes vers `packages/utils` (TD-37) ; T-04 3 → 5, vues de l'API (`RiskView`) dans le contrat et recopie `request` dans `backtest.completed` ; T-06 5 → 8, cadre des états dessiné dans Figma et cadre 13 d'origine mis à jour, mesure du rendu à 5 largeurs.

| Lot | Tâches | Points |
| --- | --- | --- |
| 1. Moteur | T-01 → T-03, T-10 | 18 |
| 2. Contrat et service | T-04 → T-05 | 11 |
| 3. Écrans | T-06 → T-09 | 13 |

**Chemin critique** (24 points) : T-01 → T-03 → T-10 → T-05 → T-06 → T-07. T-03 : la formule de contribution au risque est la plus facile à mal écrire ; le test à deux actifs non corrélés (`0,2` et `0,8`) se fait avant l'intégration. T-05 : le seuil et le risque s'ajoutent à des résultats déjà en base, donc colonnes nullables.

**Parallélisable** : T-01, T-02, T-04 dès le début ; T-06 après T-05 (ou en parallèle sur des données simulées après T-04).

## Graphe des dépendances

```mermaid
flowchart LR
    T01[T-01 Engine  matrice de corrélation]
    T02[T-02 Engine  VaR, CVaR, historique minimal]
    T03[T-03 Engine  contribution et concentration]
    T04[T-04 Contrat  risque, seuil, erreurs]
    T05[T-05 Stockage, seuil, évaluation]
    T06[T-06 Page Risque et bouton]
    T07[T-07 Contrainte  saisie et tableau]
    T08[T-08 Catalogue API et composants]
    T09[T-09 Route, sélecteur, états]
    T10[T-10 Service risk-engine]
    T01 --> T03
    T01 --> T10
    T02 --> T10
    T03 --> T10
    T04 --> T10
    T10 --> T05
    T04 --> T05
    T05 --> T06
    T04 --> T06
    T05 --> T07
    T06 --> T07
    T05 --> T08
    T06 --> T08
    T05 --> T09
    T06 --> T09
```

---

## Lot 1 — Moteur

### T-01 · Engine : matrice de corrélation

- **US** : US-01 · **Priorité** : MUST · **Points** : 3 · **Dépend de** : — · **Commits** : `042ee3b`
- **Fichiers** : `apps/risk-engine/engine/risk.utils.ts`, `apps/risk-engine/test/risk.utils.test.ts`

Critères d’acceptation :
- [x] Corrélation de Pearson des rendements journaliers, entre −1 et 1, actifs dans l'ordre de l'allocation.
- [x] Diagonale = 1 ; symétrie vérifiée par test.
- [x] Jeux connus de `US.md` (`1`, `−1`, `0`).
- [x] Fonction pure : rendements en paramètre, aucune I/O ni horloge.

### T-02 · Engine : VaR et CVaR historiques à 95 %, historique minimal

- **US** : US-02 · **Priorité** : MUST · **Points** : 5 · **Dépend de** : — · **Commits** : `042ee3b`
- **Fichiers** : `apps/risk-engine/engine/risk.utils.ts`, `risk.engine.ts`, `apps/risk-engine/test/risk.utils.test.ts`, `risk.engine.test.ts` (rendements journaliers en EUR, jours communs)

Critères d’acceptation :
- [x] VaR = `k`-ième plus petit rendement, CVaR = moyenne des `k` plus petits, `k = ceil(0,05 × n)` ; ratios un jour (D1).
- [x] Jeu connu de `US.md` : VaR `−0,46`, CVaR `−0,48`.
- [x] Rendements journaliers en EUR, change inclus (D5), sur les jours de cotation communs à tous les actifs.
- [x] Moins de 250 jours communs : aucun résultat de risque (`null`), pas d'exception (D6).

### T-03 · Engine : contribution au risque et concentration

- **US** : US-01 · **Priorité** : MUST · **Points** : 5 · **Dépend de** : T-01 · **Commits** : `042ee3b`
- **Fichiers** : `apps/risk-engine/engine/risk.utils.ts`, `risk.engine.ts`, `apps/risk-engine/test/risk.utils.test.ts`, `risk.engine.test.ts`

Critères d’acceptation :
- [x] Contribution de chaque actif à la variance : `wᵢ (Σw)ᵢ / σ²`, somme = 1 ; aucun arrondi appliqué à un cumul.
- [x] Volatilité annualisée du portefeuille et de chaque actif (colonnes `Volatilité` et carte « Volatilité annualisée »).
- [x] Concentration : HHI des poids et actifs effectifs `1 / HHI` ; poids maximal (D7).
- [x] Test sur un portefeuille à deux actifs non corrélés (`0,2` et `0,8`) et sur 30/30/30/10 (HHI `0,28`).

## Lot 2 — Contrat et service

### T-04 · Contrat : résultat de risque, seuil et erreurs

- **US** : US-01, US-02, US-03 · **Priorité** : MUST · **Points** : 3 · **Dépend de** : — · **Commits** : `042ee3b`, `e99b070`
- **Fichiers** : `packages/contracts/src/risk.ts`, `packages/contracts/src/backtest.ts` (`backtest.completed` recopie `allocations`, `startDate`, `endDate`), `packages/contracts/src/error.ts`

Critères d’acceptation :
- [x] Topic `risk.completed` (`RISK_TOPICS`) et `riskCompletedPayloadSchema` (`risk` nullable : « données insuffisantes »).
- [x] `riskSchema` : volatilité annualisée, VaR, CVaR, corrélations (actifs et matrice), contributions, expositions par actif (poids, volatilité), HHI, actifs effectifs, poids maximal ; chaque champ numérique commenté avec son unité (ratio, un jour, ordre des actifs).
- [x] `riskConstraintSchema` : `maxDrawdownLimit` ratio de 0,01 à 0,99, zod ; mesuré, statut, limite renvoyés par l'API.
- [x] Code d'erreur dédié à un seuil invalide, avec libellés FR et EN.
- [x] Producteur (engine) et consommateur (core-backend) modifiés dans le même diff ; signaler de redémarrer les services concernés.

### T-05 · Stockage du risque, seuil et évaluation de la contrainte

- **US** : US-02, US-03 · **Priorité** : MUST · **Points** : 8 · **Dépend de** : T-01, T-02, T-03, T-04 · **Commits** : `e99b070`, `c4aa35e`
- **Fichiers** : `apps/core-backend/services/risk.service.ts`, `apps/core-backend/controller/`, `routes/`, `repositories/backtest.repository.ts`, `prisma/schema.prisma`, `prisma/migrations/`, `test/risk.service.test.ts`, `consumers/risk.consumer.ts`

Critères d’acceptation :
- [x] Le consommateur de `risk.completed` stocke le risque dans une colonne `Json?` du résultat ; message invalide loggué et ignoré.
- [x] Seuil `maxDrawdownLimit` (entier de 1 à 99 en pourcentage, ratio stocké) et **2 dernières vérifications** (D12) : colonnes nullables sur le backtest ; route de lecture et de modification (propriétaire seulement), validation 1 % à 99 %, erreur 400 traduite.
- [x] Réponse de la page Risque : risque, statut de la contrainte (respectée / non respectée, valeur mesurée = `maxDrawdown` stocké, limite), sans relancer l'engine. Jeux connus de `US.md`.
- [x] Anciens backtests : risque `null`, aucune exception ; backtest non terminé ou en échec : état dédié renvoyé (D17).
- [x] Phrases de lecture : le backend fournit la paire la plus corrélée et l'actif contribuant le plus (D14).
- [x] Migration additive (colonnes nullables) ; aucun SQL écrit à la main hors migration.
- [x] Tests : service avec faux repository, route avec `startApp`, repository sur `trading_test`.

## Lot 1 bis — Service

### T-10 · Service risk-engine : création et branchement Kafka

- **US** : US-01, US-02 · **Priorité** : MUST · **Points** : 5 · **Dépend de** : T-01, T-02, T-03, T-04 · **Commits** : `042ee3b`, `5ad17f3`
- **Fichiers** : `apps/risk-engine/` (`index.ts`, `env.ts`, `consumers/`, `services/`, `publishers/`, `repositories/`, `AGENTS.md`), `package.json` racine, `.github/workflows/ci.yml`, `AGENTS.md` racine, `apps/backtest-engine/` (recopie des champs de `backtest.completed`)

Critères d’acceptation :
- [x] Worker Kafka sans HTTP ni base, calqué sur `backtest-engine` : consomme `backtest.completed`, lit cours et devises auprès de market-service, convertit en EUR, publie `risk.completed` (clé `executionId`).
- [x] Message invalide loggué et ignoré ; erreur de lecture des cours remontée à kafkajs (rejeu), rien n'est publié.
- [x] Moins de 250 jours communs : `risk.completed` avec `risk` null (D6).
- [x] Scripts `dev:risk` et `dev`, job de CI, tableau de structure du `AGENTS.md` racine, `AGENTS.md` du service.
- [x] Tests : service avec faux repository et faux publisher.

## Lot 3 — Écrans

### T-06 · Page Risque et bouton depuis le résultat

- **US** : US-01, US-02 · **Priorité** : SHOULD · **Points** : 5 · **Dépend de** : T-04, T-05 · **Commits** : `042ee3b`, `5ad17f3`
- **Fichiers** : `apps/web/src/features/backtest/` (bouton « Risque » du détail, après « Robustesse »), `apps/web/src/features/risk/` (page, cartes, matrice, contributions), `apps/web/messages/fr.json`, `en.json`

Critères d’acceptation :
- [x] Les blocs de `MAQUETTE.md` : en-tête (titre, badge `Calculé`, `Choisir un backtest`), quatre cartes, matrice en carte de chaleur, contribution au risque, expositions par actif, avec les libellés exacts.
- [x] Valeurs affichées telles que reçues (conversion de ratio en pourcentage seulement) ; `<Dash />` pour un risque absent.
- [x] Message « données insuffisantes » seul, sans carte partielle (D16) ; textes et phrases de lecture dans `messages/` FR / EN (D14).
- [x] Volatilité annualisée avec pastille « période » (D13) ; pas de pastille « Données au … » (D15).
- [x] Bouton « Risque » : contour, 3ᵉ position de l'en-tête du résultat, vers la page du backtest.

### T-07 · Contrainte de drawdown : saisie et tableau

- **US** : US-03 · **Priorité** : SHOULD · **Points** : 3 · **Dépend de** : T-05, T-06 · **Commits** : `8643c18`
- **Fichiers** : `apps/web/src/features/risk/`

Critères d’acceptation :
- [x] Champ « Drawdown maximal accepté » vide au départ, entier de 1 à 99 %, et bouton « Vérifier » ; erreur de validation affichée.
- [x] Lignes `Actuelle` et `Précédente` (2 dernières vérifications, D12) ; pas de ligne `Précédente` à la première.
- [x] Tableau `Vérification`, `Limite`, `Mesuré`, `Statut` ; badges « Respectée » (contour vert) et « Non respectée » (plein rouge) ; valeur mesurée en rouge si non respectée.
- [x] Mention « Le passé ne garantit pas l’avenir… » sous le tableau.

### T-08 · Catalogue API et composants

- **US** : US-03 · **Priorité** : SHOULD · **Points** : 1 · **Dépend de** : T-05, T-06 · **Commits** : `8643c18`
- **Fichiers** : `apps/core-backend/API.md`, `apps/web/COMPONENTS.md`, `apps/web/src/features/risk/COMPONENTS.md`

Critères d’acceptation :
- [x] Routes du risque et du seuil, composants de la page Risque documentés selon les gabarits.

### T-09 · Page Risque : route, sélecteur et états

- **US** : US-04 · **Priorité** : SHOULD · **Points** : 4 · **Dépend de** : T-05, T-06 · **Commits** : `e99b070`, `8643c18`
- **Fichiers** : `apps/web/src/app/(base)/risk/page.tsx`, `apps/web/src/features/risk/`, entrée de la barre latérale, `apps/web/messages/fr.json`, `en.json`

Critères d’acceptation :
- [x] Route `/app/risk?backtest=<id>` ; entrée « Risque » dans le groupe « Analyse » (D11).
- [x] Sélecteur « Choisir un backtest » : liste des backtests terminés de l'utilisateur.
- [x] États : vide (aucun backtest), chargement (spinner `LoadingState`, comme les autres pages, D19), données insuffisantes, sans risque avec bouton « Relancer le backtest » (D17), erreur ; mobile mesuré de 375 à 1440 px.
- [x] Thème sombre : capturé à 1440 px ; texte blanc sur les cellules soutenues de la matrice pour rester lisible.
- [x] Badge `Calculé` seulement avec un risque présent.
