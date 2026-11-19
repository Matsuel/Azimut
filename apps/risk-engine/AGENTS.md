# risk-engine

Worker Kafka sans serveur applicatif **et sans base de données** (seul un serveur de sondes écoute, voir « Sondes »). Consomme `backtest.completed` (allocations, dates de début et de fin), lit les cours et la devise de chaque actif auprès de market-service (`GET /api/market/closes` et `/dividends` via `MarketClient` de `@azimut/market-client`, assigné à `service.repo`, clé interne `INTERNAL_API_KEY`, **jamais** de fournisseur en direct), calcule le risque, puis publie `risk.completed` et `projection.completed`. **Calqué sur `apps/backtest-engine`** : lis `../backtest-engine/AGENTS.md` et reprends ses règles de couches. Respecte `../../AGENTS.md`.

Risque = rendements journaliers des actifs en euros (change inclus), pondérés aux poids cibles constants, sur les jours de cotation communs ; sous 250 jours communs, `risk` vaut `null` (roadmap 13, D1 à D21). Projection = bootstrap de blocs seedé (graine `PROJECTION_PARAMS.seed`) sur les mêmes cours en euros, capital de départ = `totalInvested`, `projection` `null` sous 2 jours communs ou si un actif n'a aucun cours (D12, roadmap 14). core-backend stocke les résultats ; il reste le seul à écrire en base.

## Structure

```
env.ts             variables validées par zod (MARKET_SERVICE_URL, INTERNAL_API_KEY, HEALTH_PORT)
probes.ts          kafkaProbeChecks : contrôles de /readiness (consumer et producer prêts)
index.ts           bootstrap : câble publisher → service → consumer, abonne. Aucune logique.
consumers/         risk.consumer.ts : valide backtest.completed (zod), appelle le service
services/          risk.service.ts : charge les cours, convertit en euros, appelle les engines, publie risk.completed puis projection.completed
engine/            calcul pur et déterministe : risk.engine.ts (computeRisk), risk.utils.ts (briques : corrélation, VaR, contributions, change), projection.engine.ts (computeProjection) et ses briques
publishers/        IRiskPublisher + classe : publication de risk.completed et projection.completed, clé = executionId
constants/         constantes (risk.constants.ts)
test/              <sujet>.test.ts
```

## Règles

- **engine/** : pur (aucune I/O, horloge ni aléa). Chaque mesure a son `bun test` sur un jeu à résultat connu (voir `roadmap/13-risk-engine/US.md`). Arrondi (6 décimales) à la publication seulement, jamais sur un cumul.
- **services/** : seul endroit où l'horloge est lue. Une erreur (market-service, taux de change) n'est pas capturée : `KafkaConsumer` la logue et kafkajs rejoue le message. Kafka est at-least-once : un rejeu republie les mêmes `risk.completed` et `projection.completed` (le risque d'abord ; si la projection lève, le rejeu republie les deux), que core-backend ignore par transition gardée.
- **consumers/** : message invalide → `logger.warn` et retour.
- Un contrat modifié l'est des deux côtés dans le même diff (`packages/contracts/src/risk.ts` et `projection.ts`, consommateur core-backend), puis signale de redémarrer les services concernés.

## Sondes

Serveur `node:http` (`startProbeServer` de `@azimut/http`) sur `HEALTH_PORT` (défaut **8004**), démarré **avant** la connexion à Kafka et fermé en dernier par `onShutdown` :

- `GET /liveness` : toujours `200 { "status": "ok" }`, aucune dépendance contrôlée.
- `GET /readiness` : `200` ou `503` avec `{ "status", "checks": { "kafka" } }` ; `kafka` vaut `ok` quand le consumer a rejoint son groupe **et** que le producer est connecté (`kafkaProbeChecks`, `probes.ts`).

## Commandes

```bash
bun run index.ts
bun test
bunx tsc --noEmit
```
