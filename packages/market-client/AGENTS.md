# @azimut/market-client

Lecture HTTP de market-service par les services qui lui demandent des cours (`backtest-engine`, `risk-engine`) : en-tête de clé interne, délai, une seconde tentative sur un échec transitoire. Pas de validation ni de logique métier : chaque repository valide le corps avec le schéma de `@azimut/contracts` qui lui convient. `process.env` ne se lit pas ici : l'URL et la clé viennent de l'`env.ts` de l'app. Respecte `../../AGENTS.md`.
