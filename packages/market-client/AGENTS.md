# @azimut/market-client

`MarketClient` (interface `IMarketClient`) : lecture HTTP de market-service par les services qui lui demandent des cours (`backtest-engine`, `risk-engine`) : en-tête de clé interne, délai, une seconde tentative sur un échec transitoire. `MarketClient` valide chaque réponse avec le schéma de `@azimut/contracts` (`dailyClosesSchema`, `dividendsSchema`) ; aucune logique métier (conversion de devise, calcul) : elle reste dans l'engine. `process.env` ne se lit pas ici : l'URL et la clé viennent de l'`env.ts` de l'app. Respecte `../../AGENTS.md`.
