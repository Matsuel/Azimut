# Dette technique

Registre de la dette connue, à corriger avant qu'elle ne grossisse. La règle qui l'alimente est dans [`AGENTS.md`](AGENTS.md#dette-technique). Audit initial du 2026-11-12 sur tout le dépôt (222 fichiers TypeScript hors `generated/` et `components/ui/`) ; les audits plus anciens (`audit/web.md`) restent des photos datées.

**Gravité** : `haute` = risque en production ou blocage d'un utilisateur ; `moyenne` = coût qui augmente à chaque feature ; `basse` = hygiène. **Effort** : S (< 2 h), M (< 1 jour), L (plus).

## Ouverte

| ID | Gravité | Zone | Dette | Où | Correction | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| TD-02 | basse | web | **Écrans web : couverture partielle** (mesure `bun test --coverage` du 2026-11-18 : 58 fichiers de `src/` jamais chargés ou sous 60 % de lignes, hors `components/ui/` et pages). Testés : `lib/{api,routes,pagination,format}`, `hooks/use-debounced-value`, `features/backtest/{api,utils}`, `features/auth/schema`, champs texte/case/interrupteur, `searchState`, `AllocationField`, `LoginForm`, `RollingWindows`, `ThemeCard`, sections `risk`, `projection`, `notifications`. Jamais chargés : écrans `features/backtest` (`backtest-detail`, `backtest-list`, `comparison/*`, `result/*`, `form/sections`, `new-backtest-form`, `quick-backtest-form`, `stats`, `metrics`), `features/market` (`market-list`, `symbol-detail`, `symbol-search`, `symbol-sheet`, `price-chart`, `column`), `RegisterForm`, `LanguageCard`, `SettingsTabs`, `BacktestRisk`, `features/{notifications,projection}/api.ts` (remplacés par `mock.module`), `lib/session`, `proxy`, `i18n/*`, `provider/query`, shell (`app-header`, `app-sidebar`, `nav-user`, `sidebar-nav`, `theme-toggle`, `app-dialog`, `app-alert-dialog`, `sparkline`). Partiels : `DateField`, `SelectField`/`OptionSelect`, `SymbolsField`, hooks de polling (`useBacktest`, `useBacktestBatch`, `useRisk`) et `features/market/hook`. | `apps/web/src/{components,features,lib,i18n}` | Un test par écran à interaction (liste filtrée, comparaison, formulaires complets), puis le polling ; graphiques vérifiés au rendu (skill `verifier-rendu`). | M |
| TD-03 | basse | dépôt | **Pas d'image Docker.** La CI et un `.env.example` par app existent ; aucun `Dockerfile` n'est suivi, donc pas de déploiement reproductible. Prévu par la feature 23 de la roadmap. | racine | Une image par service (core-backend, market-service, backtest-engine, web), testée avec Docker. | M |
| TD-21 | basse | core-backend | **Limites de débit locales au process.** Les compteurs `express-rate-limit` sont en mémoire : avec plusieurs instances de core-backend, chaque instance compte à part (`TRUST_PROXY` règle déjà le cas d'un reverse proxy unique). | `core-backend/middleware/rate-limit.middleware.ts` | Un store partagé (Redis) quand l'API tourne en plusieurs instances (feature 24). | S |
| TD-23 | basse | backtest-engine | **Chaque exécution rappelle Yahoo.** Les cours d'un backtest ne sont pas mis en cache (l'empreinte `fingerprintPrices` hache les données, mais `fetchedAt` et la fraîcheur de la dernière clôture se perdraient). Un backtest relancé 10 fois fait 10 appels par symbole. | `market-service/services/market.service.ts` (`getDailyCloses`) | Cache des clôtures antérieures à la veille (immuables), publié avec le `fetchedAt` réel de la lecture. | M |
| TD-24 | basse | web | **TypeScript 6.0 dans le web seulement.** `typescript-eslint` ne supporte pas TypeScript 7 (`>=4.8.4 <6.1.0`) : le web reste en `~6.0.3`, le reste du dépôt en `^7`. | `apps/web/package.json` | Passer le web en `^7` quand `typescript-eslint` le supporte (issue typescript-eslint#10940). | S |
| TD-25 | basse | packages/kafka | **Avertissement `TimeoutNegativeWarning` au démarrage de chaque service Kafka.** kafkajs 2.2.4 calcule un délai négatif dans sa file de requêtes (`requestQueue/index.js:317`) sous Bun ; sans effet constaté (Bun ramène le délai à 1 ms) mais bruyant. | `node_modules/kafkajs` | Suivre une version de kafkajs ou de Bun qui le corrige ; sinon filtrer cet avertissement. | S |
| TD-31 | basse | web | **Page du lot : écarts à la maquette 32 dans des composants partagés.** Comparée le 2026-11-16 à 1440 px (sections, libellés, badges, formats conformes ; sans débordement de 375 à 1440 px). Restent : fil d'Ariane « Strategy Lab › Backtests » au lieu de « Backtests › Robustesse » (`AppHeader` affiche la section active, pas la page, idem sur le détail d'un backtest) ; en-têtes de `DataTable` en `font-medium` au lieu du style atténué de la maquette ; pas de bouton pour retirer une date (absent de la maquette). | `apps/web/src/components/app-header.tsx`, `components/data-table/data-table.tsx`, `features/backtest/form/start-dates.tsx` | Fil d'Ariane alimenté par la page (titre), variant `caption` des en-têtes de `DataTable`, faire dessiner le retrait d'une date | M |
| TD-38 | basse | web | **Types de réponse recopiés dans le web.** `BacktestDetails`, `Backtest`, `BacktestResult` de `apps/web/src/features/backtest/types.ts` redécrivent à la main les réponses de core-backend (Decimal sérialisé en string) : un champ ajouté côté API s'oublie côté web sans erreur de compilation. | `apps/web/src/features/backtest/types.ts`, `apps/core-backend/interfaces/backtest.interface.ts` | Décrire les réponses sérialisées dans `packages/contracts` (comme `RiskView`) et les réexporter dans le web. | L |
| TD-41 | basse | web | **Écran Projection non comparé à la maquette.** Cadres `455:12320`, `563:14423` et `563:15104` non comparés : l'app n'a pas tourné avec backend, Kafka et base pendant le développement. Les étiquettes de fin du fan chart (P90, médiane, P10) peuvent se chevaucher quand les bandes sont serrées. | `apps/web/src/features/projection/` | Lancer la stack, comparer avec le skill `verifier-rendu` (375 à 1440 px, clair et sombre), décaler les étiquettes si besoin. | S |
| TD-44 | basse | core-backend / notification-service | **Pas d'outbox pour `notification.requested`.** Un crash de core-backend entre le commit d'une transition et la publication perd la notification ; le rejeu ne la recrée pas (la transition gardée ne modifie plus rien). Accepté (feature 15, D7) : une notification n'est pas une donnée métier. | `apps/core-backend/services/` (publication des notifications) | Table outbox écrite dans la transaction de la transition, relayée vers Kafka | M |
| TD-45 | moyenne | web | **Échec de connexion ou d'inscription : rejet non géré.** `onSubmit` de `LoginForm` et `RegisterForm` attend `mutateAsync` sans `try/catch` : des identifiants refusés laissent une promesse rejetée remonter de `handleSubmit` (erreur non gérée dans la console, et dans les tests). Le message d'erreur s'affiche probablement via `error` de la mutation (non vérifié par un test). Les formulaires de backtest, eux, attrapent l'erreur. | `apps/web/src/features/auth/login-form.tsx:28`, `register-form.tsx:26` | `try/catch` autour de `mutateAsync` comme `new-backtest-form.tsx`, puis test « identifiants refusés » dans `test/login-form.test.tsx`. | S |
| TD-46 | basse | packages/kafka, core-backend | **Tests de `packages/kafka` rangés dans core-backend.** `KafkaConsumer` et `kafkaLogCreator` sont testés par `apps/core-backend/test/kafka.consumer.test.ts` et `kafka.logger.test.ts` : le package n'a pas sa propre couverture, et `bun test` dans `packages/kafka` ne les lance pas. `packages/utils` : `periodKey`, `businessDays` et `estimateSchedule` ne sont testés que depuis `apps/backtest-engine/test/`. Non testés hors base : `utils/db.ts` (délégués Prisma non espionnables) et la route `/api/auth/*` (câblage better-auth). | `apps/core-backend/test/kafka.*.test.ts` | Déplacer ces tests dans `packages/kafka/test/` et `packages/utils/test/` ; tester `isDbConnected` sur `trading_test`. | S |
| TD-47 | basse | web | **Garde inatteignable dans `safeRedirect`.** `redirect.startsWith("//")` ne peut pas être vrai quand `redirect` commence par `/app` (test précédent) : code mort, révélé par un mutant qui survit. Pas de faille (le premier test refuse déjà `//hôte`). | `apps/web/src/lib/routes.ts:38` | Retirer la condition, ou la garder avec un commentaire si `prefix` peut devenir vide. | S |
| TD-49 | basse | core-backend | **Retrait du rôle admin effectif après 5 min.** `session.cookieCache` (`maxAge` 5 min) fait lire à `authMiddleware` un rôle mis en cache : un administrateur rétrogradé garde l'accès aux routes `requireAdmin` jusqu'à expiration du cache. | `apps/core-backend/lib/auth.ts:24` | Lire la session sans cache pour les routes admin (`disableCookieCache`) ou révoquer les sessions au changement de rôle. | S |

**Hors périmètre de cette passe** : TD-03 (CI, image, gabarit d'env). **Gardée volontairement** : TD-23 (cache des cours d'un backtest) tant que la provenance (`fetchedAt`) ne peut pas être publiée exacte.

## Fermée

| ID | Fermée le | Commit |
| --- | --- | --- |
| TD-48 | 2026-11-19 | `226c8de` |
| TD-51 | 2026-11-19 | `e567556` |
| TD-50 | 2026-11-19 | `e567556` |
| TD-43 | 2026-11-16 | `dd22326` |
| TD-42 | 2026-11-16 | `5244a98` |
| TD-40 | 2026-11-16 | `22570f2` |
| TD-39 | 2026-11-16 | `a4cc540` |
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
