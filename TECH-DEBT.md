# Dette technique

Registre de la dette connue, à corriger avant qu'elle ne grossisse. La règle qui l'alimente est dans [`AGENTS.md`](AGENTS.md#dette-technique). Audit initial du 2026-11-12 sur tout le dépôt (222 fichiers TypeScript hors `generated/` et `components/ui/`) ; les audits plus anciens (`audit/web.md`) restent des photos datées.

**Gravité** : `haute` = risque en production ou blocage d'un utilisateur ; `moyenne` = coût qui augmente à chaque feature ; `basse` = hygiène. **Effort** : S (< 2 h), M (< 1 jour), L (plus).

## Ouverte

| ID | Gravité | Zone | Dette | Où | Correction | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| TD-02 | basse | web | **Composants web : couverture partielle.** Services, consumers, routes HTTP, repositories (base `trading_test`), `KafkaConsumer`, middlewares, client de cours, hooks d'erreur et `ErrorState` sont testés. La plupart des composants partagés et des écrans de `COMPONENTS.md` n'ont pas de test (`Dash`, `StatCard`, `FilterTabs`, `EmptyCard`, `ErrorState` et les sections de `features/risk` le sont). | `apps/web/src/{components,features}` | Un test par composant partagé restant (`DataTable`, champs de formulaire, `SymbolPicker`…) et par écran de feature. | M |
| TD-03 | basse | dépôt | **Pas d'image Docker.** La CI et un `.env.example` par app existent ; aucun `Dockerfile` n'est suivi, donc pas de déploiement reproductible. Prévu par la feature 22 de la roadmap. | racine | Une image par service (core-backend, market-service, backtest-engine, web), testée avec Docker. | M |
| TD-21 | basse | core-backend | **Limites de débit locales au process.** Les compteurs `express-rate-limit` sont en mémoire : avec plusieurs instances de core-backend, chaque instance compte à part (`TRUST_PROXY` règle déjà le cas d'un reverse proxy unique). | `core-backend/middleware/rate-limit.middleware.ts` | Un store partagé (Redis) quand l'API tourne en plusieurs instances (feature 22). | S |
| TD-23 | basse | backtest-engine | **Chaque exécution rappelle Yahoo.** Les cours d'un backtest ne sont pas mis en cache (l'empreinte `fingerprintPrices` hache les données, mais `fetchedAt` et la fraîcheur de la dernière clôture se perdraient). Un backtest relancé 10 fois fait 10 appels par symbole. | `market-service/services/market.service.ts` (`getDailyCloses`) | Cache des clôtures antérieures à la veille (immuables), publié avec le `fetchedAt` réel de la lecture. | M |
| TD-24 | basse | web | **TypeScript 6.0 dans le web seulement.** `typescript-eslint` ne supporte pas TypeScript 7 (`>=4.8.4 <6.1.0`) : le web reste en `~6.0.3`, le reste du dépôt en `^7`. | `apps/web/package.json` | Passer le web en `^7` quand `typescript-eslint` le supporte (issue typescript-eslint#10940). | S |
| TD-25 | basse | packages/kafka | **Avertissement `TimeoutNegativeWarning` au démarrage de chaque service Kafka.** kafkajs 2.2.4 calcule un délai négatif dans sa file de requêtes (`requestQueue/index.js:317`) sous Bun ; sans effet constaté (Bun ramène le délai à 1 ms) mais bruyant. | `node_modules/kafkajs` | Suivre une version de kafkajs ou de Bun qui le corrige ; sinon filtrer cet avertissement. | S |
| TD-31 | basse | web | **Page du lot : écarts à la maquette 32 dans des composants partagés.** Comparée le 2026-11-16 à 1440 px (sections, libellés, badges, formats conformes ; sans débordement de 375 à 1440 px). Restent : fil d'Ariane « Strategy Lab › Backtests » au lieu de « Backtests › Robustesse » (`AppHeader` affiche la section active, pas la page, idem sur le détail d'un backtest) ; en-têtes de `DataTable` en `font-medium` au lieu du style atténué de la maquette ; pas de bouton pour retirer une date (absent de la maquette). | `apps/web/src/components/app-header.tsx`, `components/data-table/data-table.tsx`, `features/backtest/form/start-dates.tsx` | Fil d'Ariane alimenté par la page (titre), variant `caption` des en-têtes de `DataTable`, faire dessiner le retrait d'une date | M |
| TD-38 | basse | web | **Types de réponse recopiés dans le web.** `BacktestDetails`, `Backtest`, `BacktestResult` de `apps/web/src/features/backtest/types.ts` redécrivent à la main les réponses de core-backend (Decimal sérialisé en string) : un champ ajouté côté API s'oublie côté web sans erreur de compilation. `PROJECTION_HORIZONS` n'a de plus aucun consommateur à l'exécution. | `apps/web/src/features/backtest/types.ts`, `apps/core-backend/interfaces/backtest.interface.ts` | Décrire les réponses sérialisées dans `packages/contracts` (comme `RiskView`) et les réexporter dans le web. | L |
| TD-39 | basse | web | **`features/backtest/utils.ts` dépasse le seuil de 150 lignes.** Le fichier compte 154 lignes (helpers d'attente de résultat ajoutés par la feature 14) et n'est pas découpé : plus de lignes que le seuil, donc plus dur à relire. | `apps/web/src/features/backtest/utils.ts` | Sortir les helpers d'attente de résultat (`awaitResultPollMs`…) dans un fichier voisin du domaine. | S |
| TD-40 | basse | web | **`HORIZON_YEARS` recopie `PROJECTION_HORIZONS`.** Le web ne peut importer les contrats que comme types (`import type`), donc la liste des horizons (1, 3, 5, 10 ans) est écrite deux fois : un horizon ajouté au contrat s'oublie côté web sans erreur de compilation. | `apps/web/src/features/projection/constants.ts`, `packages/contracts/src/projection.ts` | Dériver le type des horizons du contrat et faire exposer la liste par l'API (ou un `as const` partagé importable). | M |
| TD-41 | basse | web | **Écran Projection non comparé à la maquette.** Cadres `455:12320`, `563:14423` et `563:15104` non comparés : l'app n'a pas tourné avec backend, Kafka et base pendant le développement. Les étiquettes de fin du fan chart (P90, médiane, P10) peuvent se chevaucher quand les bandes sont serrées. | `apps/web/src/features/projection/` | Lancer la stack, comparer avec le skill `verifier-rendu` (375 à 1440 px, clair et sombre), décaler les étiquettes si besoin. | S |
| TD-42 | basse | core-backend | **Aucun test ne vérifie que `GET /api/backtest/:id` omet `projection` (et `risk`).** Ces colonnes volumineuses ne doivent pas fuiter dans le détail d'un backtest ; seule la lecture du code l'assure. | `apps/core-backend/test/` | Test de route (ou de repository) sur la réponse du détail : les clés `projection` et `risk` sont absentes. | S |

**Hors périmètre de cette passe** : TD-03 (CI, image, gabarit d'env). **Gardée volontairement** : TD-23 (cache des cours d'un backtest) tant que la provenance (`fetchedAt`) ne peut pas être publiée exacte.

## Fermée

| ID | Fermée le | Commit |
| --- | --- | --- |
| TD-01 | 2026-11-12 | `0f5d3dd` |
| TD-04 | 2026-11-12 | `31a6edc` |
| TD-05 | 2026-11-12 | `31a6edc` |
| TD-06 | 2026-11-12 | `0f95f1b` |
| TD-07 | 2026-11-12 | `31a6edc` |
| TD-08 | 2026-11-12 | `31a6edc` |
| TD-09 | 2026-11-12 | `0f95f1b` |
| TD-10 | 2026-11-12 | `31a6edc` |
| TD-11 | 2026-11-12 | `05941a7` |
| TD-12 | 2026-11-12 | `0f5d3dd` |
| TD-13 | 2026-11-12 | `e41cd0b` |
| TD-14 | 2026-11-12 | `d301f28` |
| TD-15 | 2026-11-12 | `32c630d` |
| TD-16 | 2026-11-12 | `edb7fa7` |
| TD-17 | 2026-11-12 | `6a11371` |
| TD-18 | 2026-11-12 | `44f5bc9` |
| TD-19 | 2026-11-12 | `31a6edc` |
| TD-20 | 2026-11-12 | `e390fcf` |
| TD-22 | 2026-11-12 | `ec588af` |
| TD-26 | 2026-11-12 | `4289a50` |
| TD-28 | 2026-11-13 | `a045b8d` |
| TD-29 | 2026-11-13 | `f527181` |
| TD-32 | 2026-11-13 | `f527181` |
| TD-30 | 2026-11-13 | `ef551a9` |
| TD-33 | 2026-11-13 | `807b125` |
| TD-34 | 2026-11-13 | `2c0379e` |
| TD-36 | 2026-11-13 | `61a4cba` |
| TD-37 | 2026-11-14 | `042ee3b` |
| TD-27 | 2026-11-15 | `c4aa35e` |
| TD-35 | 2026-11-15 | `c4aa35e` |
