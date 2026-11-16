# 14 · Projection Monte Carlo — Plan de développement

> **Pour les agents** : exécuter avec `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans`, tâche par tâche. Les étapes sont des cases `- [ ]`.

**But** : la page Projection affiche, pour un backtest terminé, l'éventail des valeurs futures de son allocation (bootstrap par blocs seedé), ses percentiles annuels et sa probabilité de perte.

**Architecture** : même patron que le Risque (feature 13). `risk-engine` consomme déjà `backtest.completed` et calcule les rendements journaliers EUR par actif sur les dates communes. Il calcule aussi la projection sur ces mêmes rendements et publie `projection.completed`. `core-backend` la stocke sur `BacktestResult` (colonnes nullables, première réception gagne) et l'expose par `GET /api/projection/:backtestId`. Le web n'affiche que ce qu'il reçoit : il choisit l'horizon parmi les points annuels stockés.

**Stack** : Bun, zod (`@azimut/contracts`), kafkajs (`@azimut/kafka`), Prisma, Express 5, Next.js 16, recharts 3.10.1, TanStack Query.

**Spec** : `roadmap/14-projection-monte-carlo/README.md`, `US.md`, `TASKS.md` et la maquette Figma `34 · Projection Monte Carlo` (fichier `DmpvF0SdUJGCBfA6GsdErm`, node `455:12320`). La Tâche 0 aligne ces documents sur les décisions ci-dessous.

## Décisions prises au démarrage (2026-11-16)

| # | Décision | Remplace |
| --- | --- | --- |
| D4′ | **Transport** : un seul nouveau topic, `projection.completed`. La projection se calcule automatiquement après chaque backtest, dans `risk-engine` et sur le même `backtest.completed`. Il n'y a pas de `projection.requested` ni de POST. | D4 (deux topics, demande par POST) |
| D6′ | **Paramètres** : la projection repose sur un backtest, comme le Risque. Le backtest se choisit avec le picker. Les paramètres sont fixes et affichés en lecture seule : 10 000 scénarios, seed 42, blocs de 21 jours ouvrés, historique = période du backtest, capital = `totalInvested` du backtest. Seul l'horizon se choisit (1, 3, 5 ou 10 ans), et ce choix ne déclenche aucun calcul. | D6 (horizon envoyé au calcul) |
| D8′ | **Probabilité de perte** : elle est calculée à chaque fin d'année (1 à 10 ans), pas seulement à l'horizon final. Elle donne la part des scénarios dont la valeur est < capital. | D8 |
| D9 | **Un seul calcul sur 10 ans** : la projection couvre 2 520 jours ouvrés (10 × 252). Le sélecteur d'horizon tronque l'affichage : les trajectoires sur 5 ans sont les 5 premières années de celles sur 10 ans, avec la même seed. | — |
| D10 | **Courbe** : un point tous les 21 jours ouvrés (fin de bloc), jour 0 compris. Cela donne 121 points sur 10 ans, au lieu d'un point par jour. | D3 (précisée) |
| D11 | **Moteur** : il tourne dans `risk-engine`, pas dans `backtest-engine`. Les rendements EUR sur dates communes (`toEuros`, `commonDates`, `dailyReturns`) y existent déjà. | README « Comment » |
| D12 | **Historique minimal** : 2 jours communs (1 rendement), pas 250. Les blocs font `min(21, rendements disponibles)` jours ; `blockDays` du résultat = longueur effective. Un historique court donne une projection peu précise, affichée avec son nombre de jours. `null` seulement sous 2 jours ou si un actif n'a aucun cours. Décision utilisateur du 2026-11-16. | `MIN_PROJECTION_DAYS` (2, D12) pour la projection |

## Contraintes globales

- `AGENTS.md` racine, `apps/core-backend/AGENTS.md`, `apps/risk-engine/AGENTS.md` et `apps/web/AGENTS.md` s'appliquent à chaque tâche. `bun run verify` doit passer à la fin de chaque tâche.
- Engine pur : la seed est un paramètre, sans `Math.random`, sans horloge et sans I/O dans `engine/`. Aucun arrondi sur un cumul : on arrondit à 2 décimales (EUR) et 6 décimales (ratios) à la publication seulement.
- Chaque champ numérique du contrat porte son unité en commentaire.
- Les nouvelles colonnes Prisma sont nullables. Les champs sont optionnels côté web, et un ancien résultat s'affiche « indisponible ».
- Un consommateur reçoit un message invalide : il fait `logger.warn` puis `return`. Un rejeu de `projection.completed` n'écrase rien.
- Les textes affichés passent par `messages/fr.json` et `messages/en.json`. Le fan chart utilise `components/ui/chart.tsx`, et les primitives viennent de shadcn.
- Les catalogues `apps/core-backend/API.md`, `apps/web/COMPONENTS.md` et `apps/web/src/features/projection/COMPONENTS.md` sont mis à jour dans le diff qui crée la route ou le composant.
- Commits sans attribution Claude.

## Points d'attention en revue

1. **Historique plus court qu'un bloc (2 à 21 jours)** : projection calculée avec des blocs raccourcis (D12) ; sous 2 jours, `projection` vaut `null`, l'écran affiche « données insuffisantes » et aucun chiffre partiel. Testé en Tâche 2.
2. **Rejeu de `backtest.completed`** : risk-engine republie le risque et la projection. core-backend garde la première projection (`projectionComputedAt` non null). Testé en Tâche 4.
3. **Ancien résultat sans projection, ou exécution en cours** : l'état est `UNAVAILABLE` avec « Relancer le backtest », jamais une erreur 500. Testé en Tâches 4 et 6.
4. **Un seul actif ou rendements tous nuls** : aucune division par zéro. Les percentiles valent le capital et la probabilité de perte vaut 0, car `valeur < capital` est strict. Testé en Tâche 2.
5. **Horizon 10 ans demandé sur la page alors que le résultat stocké est complet** : le web filtre `years` et `points` sans recalculer. Testé en Tâche 6.

---

## Structure des fichiers

| Fichier | Rôle |
| --- | --- |
| `packages/contracts/src/projection.ts` (nouveau) | `PROJECTION_TOPICS`, `PROJECTION_PARAMS`, schémas `projectionPointSchema`, `projectionYearSchema`, `projectionSchema`, `projectionCompletedPayloadSchema`, `ProjectionView` |
| `apps/risk-engine/engine/projection.utils.ts` (nouveau) | `mulberry32`, `percentile` |
| `apps/risk-engine/engine/projection.engine.ts` (nouveau) | `computeProjection` (pure) |
| `apps/risk-engine/engine/risk.utils.ts` | + `portfolioReturns`, extraite de `computeRisk` et partagée |
| `apps/risk-engine/services/risk.service.ts`, `publishers/risk.publisher.ts`, `index.ts` | calcul et publication de la projection après le risque |
| `apps/core-backend/prisma/schema.prisma` + migration | `BacktestResult.projection Json?`, `projectionComputedAt DateTime?` |
| `apps/core-backend/{repositories,services,controller,consumers}/projection.*.ts`, `routes/projection/` (nouveaux) | stockage gardé, `GET /api/projection/:backtestId` |
| `apps/web/src/components/backtest-picker.tsx`, `state-card.tsx` (déplacés depuis `features/risk/`) | partagés par Risque et Projection |
| `apps/web/src/features/projection/` (nouveau) | `api.ts`, `hook.ts`, `types.ts`, `constants.ts`, `backtest-projection.tsx`, `projection-stats.tsx`, `projection-fan-chart.tsx`, `projection-percentiles.tsx`, `projection-params.tsx`, `COMPONENTS.md` |

---

### Task 0: maquette et roadmap alignées

**Fichiers** : Figma node `455:12320`, `roadmap/14-projection-monte-carlo/{README,US,TASKS}.md`

- [ ] **Étape 1 : corriger la maquette 34** (skill `figma-use` avant `use_figma`). Mettre l'en-tête dans la forme de la page Risque 32 : « Projection · <nom du backtest> », un badge, l'allocation et la période, puis le `BacktestPicker`. La carte « Paramètres de la projection » passe en lecture seule : le select Allocation, les inputs et le DatePicker deviennent des lignes `DetailRow` (Montant investi = investi du backtest, Scénarios 10 000, Seed 42, Blocs 21 jours ouvrés, Historique = période du backtest). Le sélecteur d'horizon 1/3/5/10 ans reste. Le bouton « Relancer la projection » est retiré. Ajouter un écran d'état `UNAVAILABLE` (« Relancer le backtest ») et un écran `INSUFFICIENT_DATA`.
- [ ] **Étape 2 : mettre à jour `README.md`, `US.md` et `TASKS.md`** avec D4′, D6′, D8′, D9, D10 et D11. Re-découper les tâches selon ce plan et recalculer les points. Passer le statut à `En cours`, avec la branche `feat/projection-monte-carlo`. Lancer `bun .claude/skills/feature-roadmap/check.ts roadmap/14-projection-monte-carlo` : il doit sortir sans erreur.
- [ ] **Étape 3 : commit** `docs(roadmap): feature 14 démarrée, projection adossée au backtest`.

### Task 1: contrat de projection

**Fichiers** : créer `packages/contracts/src/projection.ts` ; modifier `packages/contracts/src/index.ts`.

**Interfaces** (produites) :
```ts
export const PROJECTION_TOPICS = { completed: "projection.completed" } as const;
// Paramètres fixes (D6′) ; horizons proposés à l'affichage, en années
export const PROJECTION_PARAMS = { paths: 10_000, blockDays: 21, horizonYears: 10, seed: 42 } as const;
export const PROJECTION_HORIZONS = [1, 3, 5, 10] as const;
projectionPointSchema   // { day: int ≥ 0 (jours ouvrés depuis aujourd'hui), p5, p10, p25, p50, p75, p90, p95: number (EUR) }
projectionYearSchema    // projectionPointSchema.extend({ years: int 1..10, lossProbability: number 0..1 (ratio) })
projectionSchema        // { seed: int, paths: int, blockDays: int, capital: number (EUR), historyStart, historyEnd: "YYYY-MM-DD", historyDays: int, points: projectionPointSchema[], years: projectionYearSchema[] }
projectionCompletedPayloadSchema // { executionId, finishedAt: iso datetime, projection: projectionSchema.nullable() }
projectionCompletedEventSchema = kafkaEventSchema(projectionCompletedPayloadSchema)
export const PROJECTION_STATES = ["COMPUTED", "INSUFFICIENT_DATA", "UNAVAILABLE"] as const;
export interface ProjectionView { state: ProjectionState; projection: Projection | null }
// + types Projection, ProjectionPoint, ProjectionYear, ProjectionCompletedPayload, ProjectionState (z.infer)
```

- [ ] **Étape 1 : écrire les schémas.** Recopier la forme de `risk.ts`, avec l'unité en commentaire sur chaque nombre. Les exporter depuis `index.ts`.
- [ ] **Étape 2 : lancer `bun run verify`.** Attendu : tsc vert.
- [ ] **Étape 3 : commit** `feat(contracts): topic et schémas de projection`.

### Task 2: moteur de projection (risk-engine)

**Fichiers** : créer `apps/risk-engine/engine/projection.utils.ts` et `engine/projection.engine.ts` ; modifier `engine/risk.utils.ts` et `engine/risk.engine.ts` ; tests `test/projection.utils.test.ts`, `test/projection.engine.test.ts`.

**Interfaces** :
- Consomme : `commonDates`, `dailyReturns` (`risk.utils.ts`), `MIN_PROJECTION_DAYS` (2, D12), `PROJECTION_PARAMS`, `Projection`, `TRADING_DAYS_PER_YEAR` (252), `round`.
- Produit :
  - `portfolioReturns(weights: number[], returns: number[][]): number[]` : rendement pondéré de chaque jour (poids constants). `computeRisk` l'utilise à la place du calcul inline.
  - `mulberry32(seed: number): () => number` : PRNG dans [0, 1).
  - `percentile(sorted: Float64Array, p: number): number` : interpolation linéaire, `p` dans [0, 1].
  - `computeProjection(allocations: Allocation[], prices: DailyCloses, capital: number, seed: number): Projection | null`.

- [ ] **Étape 1 : écrire les tests qui échouent.**
  - `mulberry32` : même seed, mêmes 5 tirages ; seeds 1 et 2, suites différentes ; tous les tirages sont dans [0, 1).
  - `percentile` : sur `[1, 2, 3, 4, 5]`, `p=0.5` donne 3, `p=0.25` donne 2, `p=0.1` donne 1.4.
  - `computeProjection` : deux appels avec la même seed donnent `toEqual` ; deux seeds différentes donnent un `p50` final différent.
  - Série à rendement constant +0,1 %/jour : tous les percentiles de l'année 1 valent `capital × 1.001^252` (`toBeCloseTo(…, 2)` : EUR arrondis au centime), et `lossProbability` vaut 0.
  - Rendements tous nuls : percentiles = capital, `lossProbability` = 0.
  - 249 jours communs : `null`. Un actif sans cours : `null`.
  - Forme du résultat : `points.length` = 121, `points[0]` vaut `{ day: 0, p5..p95: capital }`, `years.length` = 10, `years[4].day` = 1 260.
  - Conservation de la corrélation (D5) : deux actifs aux séries identiques, poids 0,5/0,5, donnent le même résultat qu'un seul actif au poids 1.
- [ ] **Étape 2 : lancer `cd apps/risk-engine && bun test projection`.** Attendu : FAIL, module introuvable.
- [ ] **Étape 3 : implémenter.** `historyDays` = `dates.length`. Le résultat vaut `null` si `historyDays < MIN_COMMON_DAYS`. Algorithme (une seule passe, aucune trajectoire conservée) :
  ```
  r = portfolioReturns(weights, returns); n = r.length; values = Float64Array(paths).fill(capital); rng = mulberry32(seed)
  pour b de 0 à horizonYears*252/blockDays − 1 :
      pour p de 0 à paths−1 : s = floor(rng() * (n − blockDays + 1)); pour d de 0 à blockDays−1 : values[p] *= 1 + r[s+d]
      day = (b+1)*blockDays ; sorted = values.slice().sort() → point ; si day % 252 == 0 : year { years: day/252, lossProbability: part de values < capital }
  ```
  Les blocs sont tirés sur l'ordre fixe trajectoire puis bloc : c'est ce qui garantit la reproductibilité. Arrondir les EUR à 2 décimales et `lossProbability` à 6 décimales, au moment de construire le résultat seulement.
- [ ] **Étape 4 : lancer `bun test`** dans `apps/risk-engine`. Attendu : PASS, y compris `risk.engine.test.ts` (non-régression après l'extraction de `portfolioReturns`).
- [ ] **Étape 5 : commit** `feat(risk-engine): moteur de projection par bootstrap de blocs seedé`.

### Task 3: publication par risk-engine

**Fichiers** : modifier `apps/risk-engine/services/risk.service.ts`, `publishers/risk.publisher.ts`, `consumers/risk.consumer.ts` et `index.ts` ; test `test/risk.service.test.ts`.

**Interfaces** :
- Consomme : `computeProjection` (Tâche 2), `PROJECTION_TOPICS`, `PROJECTION_PARAMS`, `ProjectionCompletedPayload`.
- Produit : `IRiskPublisher.projectionCompleted(payload: ProjectionCompletedPayload): Promise<void>`. `RiskService.compute` reçoit aussi `totalInvested` (déjà dans `BacktestCompletedPayload`) : `Pick<…, "executionId" | "request" | "totalInvested">`.

- [ ] **Étape 1 : écrire le test qui échoue** dans `risk.service.test.ts`. Avec le faux `MarketClient` existant, `compute` appelle `projectionCompleted` une fois avec `{ executionId, projection }`. `projection.capital` vaut `totalInvested` et `projection.seed` vaut 42. `completed` (le risque) est appelé avant.
- [ ] **Étape 2 : lancer `bun test risk.service`.** Attendu : FAIL.
- [ ] **Étape 3 : implémenter.** Les cours EUR sont lus une fois et passés à `computeRisk` puis à `computeProjection`. On publie le risque, puis la projection. Le publisher envoie sur `PROJECTION_TOPICS.completed` via `createKafkaEvent`, comme `completed`. `index.ts` ajoute le topic à `ensureTopics`. Le consumer passe `totalInvested`.
- [ ] **Étape 4 : lancer `bun test`.** Attendu : PASS.
- [ ] **Étape 5 : commit** `feat(risk-engine): publie projection.completed après le risque`.

### Task 4: stockage et route côté core-backend

**Fichiers** : modifier `prisma/schema.prisma` et ajouter la migration `add_backtest_result_projection` ; créer `repositories/projection.repository.ts`, `services/projection.service.ts`, `controller/projection.controller.ts`, `consumers/projection.consumer.ts`, `routes/projection/{index.ts,projection.routes.ts}` ; modifier `index.ts` (subscribe + router après `riskRouter`) ; tests `test/projection.{repository,service,consumer,routes}.test.ts` ; `API.md`.

**Interfaces** :
- Prisma : `projection Json?` (commentaire : `Projection`, contrat projection.ts ; null tant que `projection.completed` n'est pas reçu, ou sous 2 jours communs (D12)) et `projectionComputedAt DateTime?` (même sémantique que `riskComputedAt`).
- `IProjectionRepository.getByBacktestId(backtestId, statuses): Promise<{ projection, projectionComputedAt } | null>` et `setProjection(executionId, projection: Projection | null, computedAt: Date): Promise<boolean>`. Même garde que `setRisk` : `where: { executionId, projectionComputedAt: null }`, et `Prisma.DbNull` pour null.
- `ProjectionService.store(payload: ProjectionCompletedPayload): Promise<void>` et `ProjectionService.get(backtestId, userId): Promise<ProjectionView>`. L'autorisation est la même que `RiskService.get` : `NotFoundError` si le backtest n'est pas à l'utilisateur.
- Route `GET /api/projection/:backtestId`, authentifiée, qui renvoie `ProjectionView`.

- [ ] **Étape 1 : écrire les tests qui échouent.**
  - Repository (`describeWithDb`) : un premier `setProjection` renvoie `true` ; un second renvoie `false` et ne change pas la valeur stockée.
  - Service (faux repo) : `COMPUTED` si `projection` est non null ; `INSUFFICIENT_DATA` si `projectionComputedAt` est non null et `projection` null ; `UNAVAILABLE` sans résultat terminé ou sans `projectionComputedAt` ; `NotFoundError` pour un autre utilisateur.
  - Consumer : un message invalide fait `warn` sans appeler `store` ; un message valide appelle `store`.
  - Routes (`startApp`) : 200 avec la vue ; 401 sans session.
- [ ] **Étape 2 : lancer `cd apps/core-backend && bun test projection`.** Attendu : FAIL.
- [ ] **Étape 3 : implémenter.** Copier couche par couche `risk.*`, sans la contrainte. Lancer `bunx prisma migrate dev --name add_backtest_result_projection`.
- [ ] **Étape 4 : lancer `bun test`.** Attendu : PASS. Puis ajouter la section « Projection » à `API.md` (gabarit de « Risque », exemple de réponse compris).
- [ ] **Étape 5 : commit** `feat(core-backend): stockage et lecture de la projection`.

### Task 5: composants partagés de backtest

**Fichiers** : déplacer `apps/web/src/features/risk/backtest-picker.tsx` vers `components/backtest-picker.tsx` et `risk-state-card.tsx` vers `components/state-card.tsx` (`StateCard`) ; mettre à jour les imports de `features/risk/` ; `apps/web/COMPONENTS.md` et `features/risk/COMPONENTS.md`.

- [ ] **Étape 1 : déplacer les fichiers et renommer `RiskStateCard` en `StateCard`.** Les clés i18n utilisées restent celles passées en props, et les textes restent ceux de l'appelant.
- [ ] **Étape 2 : lancer `cd apps/web && bun test && bun run verify`.** Attendu : PASS, page Risque inchangée.
- [ ] **Étape 3 : commit** `refactor(web): picker de backtest et carte d'état partagés`.

### Task 6: écran Projection

**Fichiers** : créer `apps/web/src/features/projection/*` (liste dans « Structure des fichiers ») ; modifier `app/app/projection/page.tsx` (même forme que `app/app/risk/page.tsx`), `lib/routes.ts` (`backtestProjection(id)` → `/app/projection?backtest=<id>`) et `messages/{fr,en}.json` (`pages.projection.*`) ; tests `test/projection.*.test.tsx` ; `features/projection/COMPONENTS.md` et le sommaire de `apps/web/COMPONENTS.md`.

**Interfaces** :
- `getProjection(backtestId): Promise<ProjectionView>` (`api.ts`) et `useProjection(backtestId, pollMs)` (`hook.ts`, clé `["projection", "detail", id]`, même patron que `useRisk`).
- `types.ts` dérive ses types de `@azimut/contracts` avec `import type`.
- `constants.ts` : `projectionPollMs(view)` vaut 2 000 ms tant que l'état est `UNAVAILABLE` et qu'une exécution est en cours, `false` sinon (même règle que `riskPollMs`).
- `BacktestProjection({ backtestId })` : écran racine. Il garde l'horizon choisi dans l'état local, 5 par défaut.
- `ProjectionStats({ year: ProjectionYear, capital })` : quatre `StatCard` (P50, P10, P90, probabilité de perte), avec les sous-titres de la maquette.
- `ProjectionFanChart({ points, capital, horizonYears })` : recharts `ComposedChart` dans `ChartContainer`. Il trace deux `Area` de plage (`[p10, p90]`, `[p25, p75]`), une `Line` p50 et une `ReferenceLine` au capital. L'axe X est en années (`day / 252`).
- `ProjectionPercentiles({ years, horizonYears })` : tableau shadcn avec Horizon, P10, Médiane, P90 et Prob. de perte, une ligne par année ≤ horizon.
- `ProjectionParams({ projection, horizon, onHorizonChange })` : `DetailRow` en lecture seule et `FilterTabs` 1/3/5/10 ans.

- [ ] **Étape 1 : écrire les tests qui échouent** (`@testing-library/react`, `test/render.tsx`).
  - Avec `horizon = 3`, `ProjectionPercentiles` affiche 3 lignes et `ProjectionStats` affiche les valeurs de `years[2]` formatées (`15 820 €`, `7,8 %`).
  - Un changement d'horizon ne déclenche aucune requête : `getProjection` n'est appelé qu'une fois.
  - `INSUFFICIENT_DATA` affiche le texte « données insuffisantes ».
  - `UNAVAILABLE` affiche le bouton « Relancer le backtest ».
- [ ] **Étape 2 : lancer `cd apps/web && bun test projection`.** Attendu : FAIL.
- [ ] **Étape 3 : implémenter** en suivant `features/risk/backtest-risk.tsx` (en-tête, picker, états). Les montants passent par `lib/format.ts`. La mention « calculée sur des scénarios historiques, pas une promesse » apparaît sous le graphique et sous le tableau.
- [ ] **Étape 4 : lancer `bun test`, `bun run format` puis `bun run verify`.** Attendu : PASS.
- [ ] **Étape 5 : comparer le rendu à la maquette corrigée** (skill `verifier-rendu`) avec un backtest réel (`bun run dev`).
- [ ] **Étape 6 : commit** `feat(web): page Projection (fan chart, percentiles, probabilité de perte)`.

### Task 7: clôture

- [ ] **Étape 1 : passer le skill `verify`**, puis les 5 contrôles manuels de `AGENTS.md` (« Avant de rendre la main »). Ajouter à `TECH-DEBT.md` toute dette repérée.
- [ ] **Étape 2 : clôturer la feature avec `feature-roadmap`** (mode clôture) : cocher les critères, ajouter les commits et le bilan, passer le statut à `Livrée` dans l'index.
- [ ] **Étape 3 : prévenir** qu'il faut redémarrer `risk-engine` et `core-backend` (nouveau topic, nouveau contrat).
