# backtest-engine

Worker Kafka sans serveur applicatif **et sans base de données** (seul un serveur de sondes écoute, voir « Sondes »). Consomme `backtest.requested` (publié par core-backend, contient tous les paramètres), lit les cours auprès de market-service (`GET /api/market/closes`, clé interne `INTERNAL_API_KEY`, **jamais** de fournisseur en direct), calcule, puis publie `backtest.started` puis `backtest.completed` (résultat) ou `backtest.failed` (cause). **Calqué sur `apps/core-backend`** : lis `../core-backend/AGENTS.md` et reprends ses règles de couches. Respecte `../../AGENTS.md`.

Les cours cotés hors euros sont convertis en euros par l'engine (`engine/backtest.fx.ts`, taux `EURxxx=X` lus comme des cours) et les dividendes réinvestis à l'ex-date (`backtest.portfolio.ts`) ; `runBacktest` reçoit ces données en entrée, jamais d'I/O.

Même worker pour le **pricing** (`pricing.requested` → `pricing.completed` ou `pricing.failed`, clé Kafka = `requestId`) : `consumers/pricing.consumer.ts`, `services/pricing.service.ts` (lit la courbe des taux auprès de market-service via `getRateCurve` de `MarketClient`, seulement si le taux d'actualisation vient de la courbe), `publishers/pricing.publisher.ts`, calcul pur dans `engine/bonds.ts`. Une erreur de calcul ou de courbe est publiée en `pricing.failed`, jamais levée.

S'il manque une donnée pour calculer, ajoute-la au contrat `backtest.requested` : seul core-backend lit et écrit la base.

## Structure (à respecter, crée un dossier seulement quand un fichier en a besoin)

```
env.ts             variables validées par zod (MARKET_SERVICE_URL, INTERNAL_API_KEY, HEALTH_PORT)
index.ts           bootstrap : instancie Kafka, câble publisher → service → consumer, abonne. Aucune logique.
consumers/         <domaine>.consumer.ts : valide l'événement (zod), appelle le service    (≈ controller)
services/          <domaine>.service.ts : orchestre repository + engine + publisher          (≈ service)
engine/            calcul pur et déterministe
                   <domaine>.utils.ts : briques de calcul réutilisables (arrondi, calendrier, drawdown)
                   <domaine>.portfolio.ts : état du portefeuille simulé (lignes, ordres, frais)
test/              <sujet>.test.ts : tests de l'engine (<domaine>.engine.test.ts, <domaine>.utils.test.ts) et du service
                   <domaine>.fixture.ts : jeux de cours déterministes partagés par les tests
repositories/      I<X>Repository + classe : autre source externe en lecture ; les cours viennent de `MarketClient` (`@azimut/market-client`)
publishers/        I<X>Publisher + classe : publication des événements de sortie
interfaces/        types du domaine (<domaine>.interface.ts), dérivés des contrats
errors/            erreurs métier (<nom>.error.ts)
constants/         constantes (<domaine>.constants.ts)
```

## Responsabilités par couche

- **engine/** est le **propriétaire de tous les calculs de simulation** : valeur, montant investi, rendement, drawdown, ordres, courbe. Toute métrique affichée par le web est calculée ici, ajoutée au contrat `backtest.completed`, stockée par core-backend. Pur : mêmes entrées → mêmes sorties, aucune I/O, aucun Kafka, horloge et aléa uniquement par paramètre. Chaque métrique a son `bun test`.
- **Lisibilité de l'engine** : `<domaine>.engine.ts` garde la boucle de simulation et le point d'entrée (`runBacktest`) ; une brique générique (calendrier, arrondi, suivi d'une métrique au fil des jours) va dans `<domaine>.utils.ts`. Une métrique qui dépasse quelques lignes y devient une fonction ou un tracker nommé et documenté.
- **Arrondis** : n'arrondir que les valeurs publiées (`round` : 2 décimales pour un montant, 4 pour un cours, 6 pour un ratio ou une quantité). Les cumuls (investi, frais) se font sur les valeurs non arrondies, une seule fois par grandeur.
- **Reproductibilité** : chaque résultat publie sa règle d'exécution (`executionRule`, fixée par l'engine) et la provenance des cours (`dataSource` : source déclarée par le repository, `fetchedAt` lu par le service, empreinte `fingerprintPrices`). Le jeu de référence `test/backtest.fixture.ts` (cours synthétiques entiers, graine fixe) fige les métriques dans `backtest.engine.test.ts` : un changement de calcul qui les modifie se justifie, puis met à jour les valeurs attendues.
- **Taille du message** : une série journalière ne se duplique pas ; une série parallèle (ex. `lumpSumValue`) est un champ de chaque point de la courbe, pas une seconde courbe avec ses propres dates.
- **Aperçu avant exécution** : l'estimation des versements et rebalancements (`estimateSchedule`, `packages/utils`) suit les règles de l'engine et utilise le même `periodKey` que la simulation ; core-backend l'appelle sans recalculer. Une règle de calendrier qui change se modifie dans `periodKey`/`estimateSchedule` et son test.
- **services/** orchestre : publie `started`, charge les cours, appelle l'engine, publie `completed`. Toute erreur (données, calcul, publication) → `failed` avec la cause. Seul endroit où l'horloge (`new Date()`) est lue. Ne connaît pas `kafkajs`.
- **consumers/** valide le message avec le schéma de `@azimut/contracts`, appelle **une** méthode de service. Message invalide → `logger.warn` et retour.
- **Cours** : `MarketClient` de `@azimut/market-client`, assigné à `service.repo` (un faux dans les tests), lit market-service (une seconde tentative sur injoignable, délai dépassé ou 502/503/504, jamais sur un 500) et valide leur format avec le contrat (`dailyClosesSchema`). Le jour de cotation est déjà normalisé par market-service (fuseau de la place, jamais UTC). Aucun calcul métier.
- **publishers/** publie avec `createKafkaEvent`, clé Kafka = `executionId` (tous les événements d'une exécution sur la même partition).
- Types internes dérivés des contrats (`Pick<BacktestCompletedPayload, ...>`), jamais redéfinis.

Kafka = at-least-once : un `backtest.requested` rejoué republie ses événements ; core-backend les ignore grâce aux transitions gardées.

## Ajouter une métrique ou une feature (checklist)

1. Contrat entrant/sortant → `packages/contracts` (schéma zod, unité commentée).
2. `interfaces/<domaine>.interface.ts` : types dérivés.
3. Calcul → `engine/` + test `bun test`.
4. Sources externes → `repositories/`, événements sortants → `publishers/`, chacun derrière une interface.
5. `services/<domaine>.service.ts` orchestre ; `consumers/` valide et délègue ; câblage dans `index.ts`.
6. Répercute le contrat côté core-backend (colonne, migration, `complete`) dans le même diff.

## Sondes

Serveur `node:http` (`startProbeServer` de `@azimut/http`) sur `HEALTH_PORT` (défaut **8003**), démarré **avant** la connexion à Kafka et fermé en dernier par `onShutdown` :

- `GET /liveness` : toujours `200 { "status": "ok" }`, aucune dépendance contrôlée.
- `GET /readiness` : `200` ou `503` avec `{ "status", "checks": { "kafka" } }` ; `kafka` vaut `ok` quand le consumer a rejoint son groupe **et** que le producer est connecté (`kafkaCheck` de `@azimut/http`).

## Commandes

```bash
bun run index.ts
bun test
bunx tsc --noEmit
```
