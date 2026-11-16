# risk-engine

Worker Kafka sans serveur HTTP **et sans base de données**. Consomme `backtest.completed` (allocations, dates de début et de fin), lit les cours et la devise de chaque actif auprès de market-service (`GET /api/market/closes` et `/dividends` via `MarketClient` de `@azimut/market-client`, assigné à `service.repo`, clé interne `INTERNAL_API_KEY`, **jamais** de fournisseur en direct), calcule le risque, puis publie `risk.completed`. **Calqué sur `apps/backtest-engine`** : lis `../backtest-engine/AGENTS.md` et reprends ses règles de couches. Respecte `../../AGENTS.md`.

Risque = rendements journaliers des actifs en euros (change inclus), pondérés aux poids cibles constants, sur les jours de cotation communs ; sous 250 jours communs, `risk` vaut `null` (roadmap 13, D1 à D21). core-backend stocke le résultat ; il reste le seul à écrire en base.

## Structure

```
env.ts             variables validées par zod (MARKET_SERVICE_URL, INTERNAL_API_KEY)
index.ts           bootstrap : câble publisher → service → consumer, abonne. Aucune logique.
consumers/         risk.consumer.ts : valide backtest.completed (zod), appelle le service
services/          risk.service.ts : charge les cours, convertit en euros, appelle l'engine, publie risk.completed
engine/            calcul pur et déterministe : risk.engine.ts (computeRisk), risk.utils.ts (briques : corrélation, VaR, contributions, change)
publishers/        IRiskPublisher + classe : publication de risk.completed, clé = executionId
constants/         constantes (risk.constants.ts)
test/              <sujet>.test.ts
```

## Règles

- **engine/** : pur (aucune I/O, horloge ni aléa). Chaque mesure a son `bun test` sur un jeu à résultat connu (voir `roadmap/13-risk-engine/US.md`). Arrondi (6 décimales) à la publication seulement, jamais sur un cumul.
- **services/** : seul endroit où l'horloge est lue. Une erreur (market-service, taux de change) n'est pas capturée : `KafkaConsumer` la logue et kafkajs rejoue le message. Kafka est at-least-once : un rejeu republie le même `risk.completed`, que core-backend ignore par transition gardée.
- **consumers/** : message invalide → `logger.warn` et retour.
- Un contrat modifié l'est des deux côtés dans le même diff (`packages/contracts/src/risk.ts`, consommateur core-backend), puis signale de redémarrer les services concernés.

## Commandes

```bash
bun run index.ts
bun test
bunx tsc --noEmit
```
