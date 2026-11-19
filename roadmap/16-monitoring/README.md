# 16 · Monitoring : sondes de santé et page d'état des services

- **Statut** : En cours
- **Roadmap** : Hors « Roadmap annuelle » — demande du 2026-11-18 : la page Monitoring (squelette vide depuis la feature 04) passe avant les taux et obligations, et les sondes `/liveness` et `/readiness` sont posées avant Kubernetes (24).
- **Période** : depuis le 2026-11-19
- **Branche / PR** : `feat/monitoring` — PR à ouvrir
- **Points** : 35 (MUST 33, SHOULD 2) — prévus
- **Maquettes** : `09 · Monitoring` (existante, node `22:1954`, dessinée en feature 04) ; copie réduite `09 · Monitoring · à modifier (F16)` (node `606:14644`), section `Feature 16 · Monitoring (09)` (node `606:14643`)
- **Écrans modifiés** : `09 · Monitoring` (node `22:1954`) : tableau « Services » alimenté par les sondes (lignes `notification-service` et `risk-engine` ajoutées, colonnes Dépendances et Latence, colonnes CPU, Mémoire et Inst. retirées), quatre cartes de synthèse (disponibles, dégradés, hors ligne, intervalle), blocs « Débit des messages », « Topics Kafka » et « Exécutions en cours » retirés — dessiné dans la copie `09 · Monitoring · à modifier (F16)` (node `606:14644`) ; états chargement et erreur à dessiner (décision du 2026-11-19) ; l'original est mis à jour au codage
- **Dépend de** : 04 (rôles, garde admin) ; 15 (notification-service livré, dernier service à sonder).

## Objectif

Un administrateur voit en un coup d'œil quels services répondent et pourquoi l'un d'eux ne répond pas (base, Kafka ou fournisseur Yahoo injoignable). Chaque service expose les deux sondes que Kubernetes lira en 24 : `/liveness` (le processus tourne) et `/readiness` (il peut servir ou consommer). La page Monitoring et Kubernetes lisent ainsi la même source, écrite une seule fois.

## Comment

- **Contrat** : `packages/contracts/src/monitoring.ts` (états `up` / `degraded` / `down`, forme d'une sonde, liste des services surveillés).
- **Sondes** : helpers dans `packages/http` (une route Express pour core-backend, market-service et notification-service ; un petit serveur `node:http` pour les deux workers Kafka, `backtest-engine` et `risk-engine`, qui n'écoutent aucun port aujourd'hui). `KafkaConsumer` et `KafkaProducer` (`packages/kafka`) exposent `isReady()` d'après les événements `kafkajs`.
- **Agrégation** : `core-backend` interroge les `/readiness` des cinq services en parallèle (délai de 2 s), calcule l'état de chacun et la synthèse (compteurs par état, services hors ligne) et l'expose sur `GET /api/admin/monitoring/services`, réservé aux administrateurs (nouveau middleware `requireAdmin`). Le web affiche et se rafraîchit toutes les 15 s, sans rien calculer (règle « Responsabilités »).
- **Remplacement de `/health`** : supprimé des trois services qui l'avaient ; aucune route de santé en double.

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | **Routes** : `GET /liveness` et `GET /readiness`, à la racine, sans authentification, sur les cinq services ; `/health` supprimé (**rupture** : `apps/web/e2e/fake-market.ts` et la documentation sont mis à jour dans le même diff) | Noms demandés le 2026-11-18, ceux des probes Kubernetes ; une seule route de santé par service. | Validée le 2026-11-19 |
| D2 | **Contenu** : `/liveness` répond toujours `200 { "status": "ok" }`, sans toucher aucune dépendance ; `/readiness` répond `200` ou `503` avec `{ "status", "checks": { "database"?, "kafka"? } }` | Une liveness qui teste la base ferait redémarrer le pod à chaque panne de base, sans rien réparer. | Validée le 2026-11-19 |
| D3 | **Dépendances de `/readiness`** : core-backend = base `trading` + Kafka ; notification-service = base `notifications` + Kafka ; backtest-engine et risk-engine = Kafka ; market-service = fournisseur Yahoo (`checks.provider`) | L'utilisateur veut savoir si Yahoo répond : sans lui, market-service ne sert aucun cours. Proposition initiale (Yahoo exclu) refusée. | Modifiée le 2026-11-19 |
| D4 | **Prêt côté Kafka** : consumer prêt après `GROUP_JOIN`, non prêt après `CRASH`, `STOP` ou `DISCONNECT` ; producer prêt après `CONNECT` | Le groupe peut mettre des dizaines de secondes à se rejoindre après un redémarrage (voir `index.ts` de core-backend) : le service écoute avant, mais n'est « prêt » qu'ensuite. | Validée le 2026-11-19 |
| D5 | **Ports des workers** : variable `HEALTH_PORT`, 8003 pour `backtest-engine`, 8004 pour `risk-engine` | Même schéma que 8000 à 8002 ; un seul listener minimal, sans Express dans les workers. | Validée le 2026-11-19 |
| D6 | **Calcul de l'état par `core-backend`** : `up` = `200`, `degraded` = `503` (service joignable, dépendance KO), `down` = délai dépassé ou connexion refusée | Le web affiche l'état tel quel ; deux clients montreraient le même résultat. | Validée le 2026-11-19 |
| D7 | **Périmètre de la page** : statuts des services uniquement ; CPU et mémoire arrivent avec Prometheus (25) ; débit des messages, topics Kafka avec lag et exécutions en cours ne sont planifiés dans aucune feature | Choix de l'utilisateur le 2026-11-18. | Décision du 2026-11-18 |
| D8 | **Numérotation** : la feature prend le numéro 16 ; les features 16 à 25 deviennent 17 à 26 (dossiers, dépendances, copies Figma `(F<NN>)`) | Respecter l'ordre d'exécution voulu, comme pour la 15 (D12). | Décision du 2026-11-18 |
| D9 | **Synthèse calculée par `core-backend`** : la réponse porte `summary` (`total`, `up`, `degraded`, `down`, `downServices`) en plus des lignes ; le web affiche les quatre cartes sans compter | Les cartes de la maquette sont des totaux : règle « Responsabilités ». | Décision du 2026-11-19 |
| D10 | **Contrôle de Yahoo** : une requête légère sur un symbole fixe, délai propre de 1,5 s, résultat (succès ou échec) gardé 60 s dans `TtlCache` | Les probes Kubernetes et la page (15 s) ne doivent pas multiplier les appels au fournisseur, ni dépasser le délai de 2 s de l'agrégation. | Décision du 2026-11-19 |
| D11 | **États chargement et erreur de la page** : dessinés dans la copie F16 avant le code de T-11 | Choix de l'utilisateur le 2026-11-19. | Décision du 2026-11-19 |

## Écarts au plan

Aucun : feature planifiée, rien de livré. L'écran « Trace d'une exécution » (section Figma `Mois 11 · Observabilité`) a été supprimé le 2026-11-18 : la page Monitoring est la seule maquette de suivi, et plus aucun écran n'a besoin du bloc « Exécutions en cours ».

## Bilan

À écrire à la clôture de la feature.

## Fichiers

- [`US.md`](US.md) — user stories et critères d’acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
