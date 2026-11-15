# 13 · Risk Engine

- **Statut** : Livrée
- **Roadmap** : Mois 6 — Mois 6 — Risk Engine (corrélations, VaR / CVaR, contribution au risque, contraintes)
- **Période** : 2026-11-14 → 2026-11-15
- **Branche / PR** : `feat/13-risk-engine` — PR à ouvrir
- **Points** : 42 prévus (MUST 29, SHOULD 13 ; 25 avant l'affinage du 2026-11-13, 37 avant le microservice D22) ; 50 réalisés
- **Maquettes** : `33 · Risque` (node `454:12126`) et `33 · Risque · états (F13)` (node `532:17845`, proposée le 15/11/2026), décrites dans [`MAQUETTE.md`](MAQUETTE.md)
- **Écrans modifiés** : `13 · Résultat d’un backtest` (node `350:7214`) : bouton « Risque » vers `/app/risk?backtest=<id>` (décision : pas de bloc dans le résultat) — original mis à jour le 2026-11-15 (`531:17341`, avec « Robustesse » `531:17339` de la feature 12)
- **Dépend de** : 11 (rendements corrects). Gèle le moteur de simulation à la fin de cette feature.

## Objectif

L'utilisateur voit où vient le risque de son portefeuille : corrélations, perte d'un mauvais jour, part de chaque actif, et si une contrainte est respectée. Cette feature a l'objectif pédagogique 1 du README (volatilité, corrélation).

## Comment

Nouveau microservice `apps/risk-engine` (D22), worker Kafka calqué sur `backtest-engine` : il consomme `backtest.completed`, lit les cours auprès de market-service, calcule le risque (fonctions pures dans `risk-engine/engine/`) sur les rendements journaliers des actifs en EUR pondérés aux poids cibles, et publie `risk.completed` (schéma de `contracts`). `core-backend` consomme `risk.completed` et stocke le risque avec le résultat ; il stocke aussi le seuil de drawdown et évalue la contrainte à partir du drawdown maximal déjà calculé, sans relancer l'engine ; le web affiche. Le moteur de simulation (`backtest-engine`) est gelé à la fin (roadmap mois 6).

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | **VaR et CVaR** : historiques, 95 %, un jour, **en % seulement** | Méthode la plus simple à expliquer et à tester ; la maquette 33 n'affiche aucun montant en euros. | PO, 2026-11-13 |
| D2 | **Expositions** : par actif seulement | Secteur et zone exigent les données `assetProfile` de Yahoo, non appelées aujourd'hui : reportées (note de la maquette : « non disponibles dans cette version »). | PO, 2026-11-13 |
| D3 | **Contraintes** : drawdown maximal seulement en MVP | Évite un moteur de règles ; les autres contraintes sont hors périmètre. | PO, 2026-11-13 |
| D4 | **Base du calcul** : rendements journaliers des actifs, pondérés aux **poids cibles constants** | Corrélation et contribution à la variance sont une valeur unique par actif, testable sur un jeu à résultat connu. Versements (DCA) et rebalancement n'influencent pas le risque affiché ; la page le dit. | PO, 2026-11-13 |
| D5 | **Devise** : EUR, effet de change inclus | Cohérent avec le rendement total de la feature 11. | PO, 2026-11-13 |
| D6 | **Historique minimal** : 250 jours de cotation communs à tous les actifs, sinon « données insuffisantes » (aucun résultat de risque) | Une VaR à 95 % sur moins d'un an n'a pas de sens. Un actif sans cours sur la période commune réduit l'intersection ; sous 250 jours le risque est absent (proposé, à valider avec le cas limite). | PO (250 jours) ; cas limite proposé |
| D7 | **Concentration** : indice de Herfindahl sur les **poids** (`HHI`), actifs effectifs = 1 / HHI | La maquette l'impose : HHI 0,28 pour 30/30/30/10 (3 × 0,09 + 0,01), « 3,6 actifs effectifs », valeur en grand = poids maximal (30 %). | `MAQUETTE.md` |
| D8 | **Benchmark** exclu de la matrice et des contributions | La matrice de la maquette ne montre que les actifs de l'allocation. | `MAQUETTE.md` |
| D9 | **Seuil de drawdown** : saisi sur la page Risque, modifiable à tout moment, stocké avec le backtest (nullable), **aucun défaut** (champ vide au départ), entier de 1 % à 99 % ; sans seuil, pas de ligne « Actuelle » | `core-backend` réévalue sans relancer l'engine, à partir du drawdown maximal du résultat (`maxDrawdown`). Hors plage : erreur 400 avec un message traduit (FR / EN). | PO, 2026-11-13 |
| D10 | **Exécution** : risque calculé par l'engine à chaque backtest et stocké ; un ancien backtest n'en a pas tant qu'on ne le relance pas | Un champ ajouté à un résultat stocké est nullable (`AGENTS.md`) ; l'écran affiche `<Dash />` ou un message pour un résultat antérieur, sans recalcul. | PO, 2026-11-13 |
| D11 | **Route** : page autonome `/app/risk?backtest=<id>`, entrée « Risque » dans le groupe « Analyse » de la barre latérale ; sans `backtest`, état vide + bouton « Choisir un backtest » ; le bouton « Risque » du résultat (après « Robustesse ») y mène | La maquette a un fil d'Ariane `Analyse › Risque` et un sélecteur de backtest : la page ne dépend pas d'un résultat ouvert. | PO, 2026-11-13 |
| D12 | **Historique des vérifications** : les **2 dernières** (lignes « Actuelle » et « Précédente ») sont stockées avec le backtest ; la première vérification n'a pas de « Précédente » | La maquette montre deux lignes ; deux suffisent à comparer sans créer de table. | PO, 2026-11-13 |
| D13 | **Volatilité** annualisée sur **toute la période**, pastille « période » (pas de volatilité à 1 an) | Un seul calcul, même base que les autres mesures de risque. | PO, 2026-11-13 |
| D14 | **Phrases de lecture** (paire la plus corrélée, actif qui contribue le plus) : texte i18n dans le web, **valeurs fournies par le backend** | Le web ne recalcule rien ; FR / EN via `messages/`. | PO, 2026-11-13 |
| D15 | Pastille **« Données au … »** de la barre du haut : **supprimée** | La date ne correspond pas à la fin du backtest. | PO, 2026-11-13 |
| D16 | **Données courtes : tout ou rien** (< 250 jours communs) : message « données insuffisantes », aucune carte partielle | Évite des chiffres calculés sur des bases différentes. | PO, 2026-11-13 |
| D17 | **Backtest sans risque** (ancien, en cours, en échec) : message d'état + bouton « Relancer le backtest » | Un ancien résultat n'est pas recalculé (D10) ; l'utilisateur peut le relancer. | PO, 2026-11-13 |
| D18 | **Sélecteur « Choisir un backtest »** : liste des backtests terminés de l'utilisateur | Seuls les résultats terminés ont un risque. | PO, 2026-11-13 |
| D19 | **États chargement et erreur** : mêmes composants et messages que les autres pages | Cohérence du design system. | PO, 2026-11-13 |
| D20 | **Un seul actif** : matrice affichée telle quelle (`1,00`) | Pas de cas particulier à coder. | PO, 2026-11-13 |
| D21 | **Actifs sans historique sur la période** (cas limite de D6) : aucun traitement particulier ; l'intersection des jours communs se réduit et, sous 250 jours, c'est « données insuffisantes » (D16). Aucun actif n'est écarté pour sauver le calcul | Même règle pour tous, rien à coder en plus ; l'utilisateur retire l'actif ou change de période. | PO, 2026-11-13 |

| D22 | **Microservice `apps/risk-engine`** : consomme `backtest.completed`, publie `risk.completed` ; `backtest-engine` ne calcule pas le risque | Un propriétaire par calcul et un moteur de simulation gelé. `backtest.completed` recopie `allocations`, `startDate` et `endDate` de la requête pour que risk-engine reste sans état. Le risque arrive après le résultat : tant que `risk.completed` n'est pas reçu, la page affiche l'état « sans risque » (D17). Rendements de cours en EUR, sans dividendes. | PO, 2026-11-14 |

### Encore à trancher

Rien : tous les points ouverts sont tranchés (D1 à D22).

## Écarts au plan

- **Microservice** (D22) : le risque n'est pas calculé dans `backtest-engine` mais par un nouveau worker `apps/risk-engine`, qui consomme `backtest.completed` et publie `risk.completed`. `backtest.completed` recopie `request` (allocations, dates) pour que risk-engine reste sans état ; core-backend ne la stocke pas.
- **Rendements de cours** : risk-engine lit les clôtures ajustées des splits, sans dividendes, converties en EUR (D22).
- **Route** : `GET /api/risk/:backtestId` et `PUT /api/risk/:backtestId/constraint` (domaine `risk` propre plutôt que sous `/api/backtest`).
- **États** : chargement par le spinner commun (D19), pas de squelette ; cadre des états proposé dans Figma (`532:17845`).

## Bilan

Livré : corrélations, VaR et CVaR historiques à 95 %, contributions au risque, concentration (HHI, actifs effectifs) et volatilité annualisée, calculées par `risk-engine/engine/` (fonctions pures testées sur les jeux de `US.md`) ; stockage dans `BacktestResult.risk` (`riskComputedAt` distingue « données insuffisantes » de « pas encore de risque ») ; contrainte de drawdown avec les deux dernières limites ; page Risque (maquette 33) et ses états, bouton « Risque » du résultat. Vérifié de bout en bout en local : backtest 30/30/30/10 de 2016 à 2026 → `risk.completed` → page Risque, mesurée sans débordement de 375 à 1440 px, en clair et en sombre.

50 points réalisés pour 42 prévus : extraction de `packages/market-client` et des briques partagées de `packages/utils` (TD-37), vues de l'API dans le contrat, cadres Figma des états. Dette : TD-37, TD-27 et TD-35 fermées ; TD-31 réduite (débordement de la page du lot à 768 px corrigé) ; TD-38 ouverte (types de réponse recopiés dans le web). Le cadre des états reste à valider par le PO. Redémarrer core-backend, backtest-engine et risk-engine (contrat `backtest.completed` changé, migration `20261114100000_backtest_risk`). Le moteur de simulation est gelé.

## Fichiers

- [`US.md`](US.md) — user stories et critères d’acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
