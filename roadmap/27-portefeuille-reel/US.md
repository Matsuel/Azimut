# 27 · Portefeuille réel : positions, import et analyse — User stories

> Sources : idée du 2026-11-25 (agrégateur de comptes, projections sur un portefeuille réel), `roadmap/08-portfolio-v1/` (allocations), `roadmap/14-projection-monte-carlo/` (projection), `roadmap/fix-10-parametres-profil/` (réinitialisation des données). Aucune maquette n'existe encore : les écrans sont à dessiner avant le code (`apps/web/AGENTS.md`, « Maquette d'abord »).

## Point de départ

| Couche | Existant | Manque |
| --- | --- | --- |
| `prisma/schema.prisma` | `Portfolio` (`userId`, `name`) et `TradingAccount` (`balance`, paper trading, sans écran actif) ; `Backtest`, `BacktestAllocation` (`weight` `Decimal(3,2)`) | `PortfolioPosition`, `Backtest.portfolioId` nullable |
| `core-backend` | `PortfolioController`, `PortfolioService` : CRUD d'un `Portfolio` (nom) ; `BacktestService` crée un backtest et publie `backtest.requested` | Positions (CRUD), valorisation, import CSV, création d'un backtest d'analyse |
| `packages/contracts` | `allocationsSchema` (poids au pourcent, somme = 1), `backtestRequestedPayloadSchema`, codes d'erreur `API_ERROR_CODES` | Schémas de position et d'import, codes d'erreur d'import |
| `packages/market-client` | `MarketClient` : cours et dividendes | Utilisation depuis `core-backend` pour la valorisation (aujourd'hui `backtest-engine` et `risk-engine`) |
| `apps/market-service` | `GET /api/market/search`, `/closes`, taux de change (feature 11) | Résolution d'un ISIN en symbole : à vérifier (D3) |
| `apps/web` | Formulaire de backtest (`features/backtest/form/`, sélecteur de symboles), pages Risque et Projection, `features/settings` (réinitialisation) | Feature `portfolio` (liste, positions, saisie, import, analyse) ; entrée de sidebar |
| Moteurs | `risk-engine` calcule risque et projection après `backtest.completed` | Rien : réutilisés tels quels (D5) |

## Hors périmètre

- **Connexion bancaire (agrégateur DSP2)** : feature ultérieure, rangée dans les extensions COULD. Le modèle garde une `source` pour l'accueillir.
- **Limites par offre** (nombre de portefeuilles, etc.) : feature 28.
- **Fonds sans cotation** (fonds en euros, assurance-vie non cotée) : seuls les actifs que `market-service` sait coter sont acceptés.
- **Versements réguliers et objectifs** sur la projection : extensions COULD de la roadmap (objectifs financiers).
- **Historique des positions** (ordres, dividendes perçus, plus-values réalisées) : une position est un instantané.

## Décisions à valider

| # | Sujet | Proposition | Raison |
| --- | --- | --- | --- |
| D1 | Modèle | Réutiliser `Portfolio` comme conteneur, ajouter `PortfolioPosition` ; `TradingAccount` inchangé. | Pas de second conteneur ; `onDelete: Cascade` fait suivre la réinitialisation de fix-10. |
| D2 | Position | `symbol`, `quantity` (parts, décimal), `costBasis` optionnel (prix de revient unitaire, devise de cotation), `isin` optionnel (conservé s'il vient de l'import), `source` (`MANUAL`, `IMPORT`), `updatedAt`. Unique par (`portfolioId`, `symbol`). Au plus 50 positions par portefeuille. | Le minimum pour valoriser et pour calculer la plus-value ; 50 est une limite de départ, à ajuster. |
| D3 | ISIN | L'import accepte un ISIN ou un symbole. L'ISIN est résolu par `GET /api/market/search` de `market-service` si Yahoo le permet ; sinon, l'import exige le symbole. Un ISIN non résolu **rejette la ligne**, il n'est jamais deviné. | Un mauvais mapping fausserait tout le portefeuille ; à vérifier sur trois ETF de PEA avant de s'engager (T-03). |
| D4 | Valorisation et poids | Calculés par un service de `core-backend` : valeur = quantité × dernier cours, convertie en EUR (feature 11). Poids = part de la valeur totale, arrondie au pourcent par la méthode du plus fort reste, avec 1 % minimum par position ; somme = 100 %. | `BacktestAllocation.weight` est un ratio au pourcent (feature 08, D2) et `allocationsSchema` exige somme = 1. Le web n'affiche que le résultat. |
| D5 | Analyse | `POST /api/portfolio/:id/analysis` crée un `Backtest` : `LUMP_SUM`, `initialAmount` = valeur actuelle EUR, allocations = poids D4, période = N dernières années (1, 3, 5 ou 10 ; défaut 5), `rebalanceFrequency` `NONE`, frais 0, sans benchmark, puis publie `backtest.requested`. Risque et projection suivent par les flux existants. L'écran écrit clairement que les **poids actuels sont appliqués à l'historique**. | Zéro nouveau moteur ni contrat Kafka ; la projection part de la valeur actuelle (capital = `totalInvested`). |
| D6 | Lien analyse → portefeuille | `Backtest.portfolioId` nullable (`onDelete: SetNull`) ; le nom par défaut est `Analyse · <portefeuille> · <date>`. | Permet de retrouver la dernière analyse d'un portefeuille ; un champ nullable respecte la règle des résultats stockés qui évoluent. |
| D7 | Historique court | Un actif plus récent que la période demandée garde le comportement de la feature 12 (historique effectif, `INSUFFICIENT_DATA` si trop court) ; l'écran n'ajoute aucune règle. | Pas de seconde règle à maintenir. |

---

## User stories

### Lot 1 — Positions

#### US-01 · Saisir les positions d'un portefeuille — MUST

**En tant qu'** utilisateur, **je veux** créer un portefeuille et y ajouter, modifier ou supprimer des positions (symbole, quantité, prix de revient facultatif) **afin de** décrire ce que je détiens vraiment.

Critères d'acceptation :
- [ ] Le symbole se choisit avec le sélecteur de symboles existant ; un doublon de symbole est refusé avec un message clair.
- [ ] Une quantité nulle ou négative et un prix de revient négatif sont refusés côté API (`zod`) et côté formulaire.
- [ ] Au-delà de 50 positions, l'API répond par une erreur dédiée.
- [ ] Un utilisateur ne peut lire ni modifier le portefeuille d'un autre (réponse `404`).
- [ ] Un portefeuille supprimé supprime ses positions ; « Réinitialiser mes données » (fix-10) les supprime aussi.

Tâches : T-01, T-02, T-04, T-09, T-13, T-14.

#### US-02 · Importer un relevé — MUST

**En tant qu'** utilisateur, **je veux** importer un fichier CSV (ISIN ou symbole, quantité, prix de revient) **afin de** ne pas ressaisir mon PEA ligne par ligne.

Critères d'acceptation :
- [ ] Un fichier valide crée ou met à jour les positions (clé : symbole) avec la source `IMPORT`.
- [ ] Les lignes invalides (ISIN non résolu, quantité absente, doublon dans le fichier) sont rejetées, avec leur numéro de ligne et un motif ; les autres lignes sont importées.
- [ ] Le résultat affiche le nombre de lignes importées et la liste des lignes rejetées.
- [ ] Un fichier de plus de 50 positions, ou non CSV, est refusé en bloc avec un message clair.
- [ ] Rejouer le même fichier ne duplique rien (même résultat).

Tâches : T-03, T-06, T-10, T-13.

#### US-03 · Voir la valeur et les poids — MUST

**En tant qu'** utilisateur, **je veux** voir la valeur actuelle de chaque position et du portefeuille, son poids et sa plus-value **afin de** savoir où j'en suis.

Critères d'acceptation :
- [ ] Chaque position affiche valeur (EUR), poids (%) et, si le prix de revient est connu, plus-value en montant et en pourcentage ; sinon `<Dash />`.
- [ ] La valeur totale et les poids viennent de l'API ; la somme des poids affichés vaut 100 %.
- [ ] Un actif sans cours disponible est signalé position par position, sans empêcher d'afficher les autres.
- [ ] La date du dernier cours utilisé est affichée.
- [ ] Les données calculées (valeur, poids, plus-value) portent une aide contextuelle (`InfoHint`, entrées `glossary.<clé>` en FR et EN).

Tâches : T-05, T-08.

### Lot 2 — Analyse

#### US-04 · Analyser mon portefeuille — MUST

**En tant qu'** utilisateur, **je veux** lancer une analyse de mon portefeuille sur 1, 3, 5 ou 10 ans **afin d'** obtenir son risque et sa projection Monte Carlo.

Critères d'acceptation :
- [ ] Un clic crée un backtest d'analyse (D5) et renvoie son identifiant ; le risque et la projection sont calculés par les flux existants.
- [ ] La projection part de la valeur actuelle du portefeuille.
- [ ] L'écran précise que les poids actuels sont appliqués à l'historique et que ce n'est pas un conseil.
- [ ] Un portefeuille vide ou sans cours exploitable ne lance pas d'analyse et dit pourquoi.
- [ ] Relancer l'analyse crée un nouveau backtest sans modifier les précédents.

Tâches : T-07, T-11, T-13.

#### US-05 · Retrouver risque et projection depuis le portefeuille — SHOULD

**En tant qu'** utilisateur, **je veux** ouvrir la page Risque ou Projection de la dernière analyse depuis mon portefeuille **afin de** ne pas chercher le bon backtest dans la liste.

Critères d'acceptation :
- [ ] Le portefeuille affiche l'état de sa dernière analyse (en cours, terminée, indisponible) et ses liens vers Risque et Projection.
- [ ] Sans analyse, les liens sont absents et l'écran propose de lancer l'analyse.

Tâches : T-12.

---

## Récapitulatif

| US | Titre | Priorité | Lot | Couches |
| --- | --- | --- | --- | --- |
| US-01 | Saisir les positions | MUST | 1 | contracts, base, core-backend, web |
| US-02 | Importer un relevé | MUST | 1 | contracts, market-service, core-backend, web |
| US-03 | Voir la valeur et les poids | MUST | 1 | core-backend, web |
| US-04 | Analyser mon portefeuille | MUST | 2 | core-backend, web |
| US-05 | Retrouver risque et projection | SHOULD | 2 | web |
