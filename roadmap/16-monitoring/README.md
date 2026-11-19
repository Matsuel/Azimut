# 16 · Monitoring : sondes de santé et page d'état des services

- **Statut** : Planifiée
- **Roadmap** : Hors « Roadmap annuelle » — demande du 2026-11-18 : la page Monitoring (squelette vide depuis la feature 04) passe avant les taux et obligations, et les sondes `/liveness` et `/readiness` sont posées avant Kubernetes (24).
- **Période** : à fixer au démarrage de la feature
- **Branche / PR** : `feat/monitoring` — PR à ouvrir
- **Points** : 35 (MUST 33, SHOULD 2) — prévus
- **Maquettes** : `09 · Monitoring` (existante, node `22:1954`, dessinée en feature 04 : à réduire au périmètre de cette feature)
- **Écrans modifiés** : `09 · Monitoring` (node `22:1954`) : tableau « Services » alimenté par les sondes (lignes `notification-service` et `risk-engine` ajoutées, colonnes Dépendances et Latence, colonnes CPU, Mémoire et Inst. retirées), blocs « Débit des messages », « Topics Kafka » et « Exécutions en cours » retirés — à dessiner (copie `09 · Monitoring · à modifier (F16)` dans la section Figma de la feature)
- **Dépend de** : 04 (rôles, garde admin) ; 15 (notification-service livré, dernier service à sonder).

## Objectif

Un administrateur voit en un coup d'œil quels services répondent et pourquoi l'un d'eux ne répond pas (base ou Kafka injoignable). Chaque service expose les deux sondes que Kubernetes lira en 24 : `/liveness` (le processus tourne) et `/readiness` (il peut servir ou consommer). La page Monitoring et Kubernetes lisent ainsi la même source, écrite une seule fois.

## Comment

- **Contrat** : `packages/contracts/src/monitoring.ts` (états `up` / `degraded` / `down`, forme d'une sonde, liste des services surveillés).
- **Sondes** : helpers dans `packages/http` (une route Express pour core-backend, market-service et notification-service ; un petit serveur `node:http` pour les deux workers Kafka, `backtest-engine` et `risk-engine`, qui n'écoutent aucun port aujourd'hui). `KafkaConsumer` et `KafkaProducer` (`packages/kafka`) exposent `isReady()` d'après les événements `kafkajs`.
- **Agrégation** : `core-backend` interroge les `/readiness` des cinq services en parallèle (délai de 2 s), calcule l'état de chacun et l'expose sur `GET /api/admin/monitoring/services`, réservé aux administrateurs (nouveau middleware `requireAdmin`). Le web affiche et se rafraîchit toutes les 15 s, sans rien calculer (règle « Responsabilités »).
- **Remplacement de `/health`** : supprimé des trois services qui l'avaient ; aucune route de santé en double.

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | **Routes** : `GET /liveness` et `GET /readiness`, à la racine, sans authentification, sur les cinq services ; `/health` supprimé (**rupture** : `apps/web/e2e/fake-market.ts` et la documentation sont mis à jour dans le même diff) | Noms demandés le 2026-11-18, ceux des probes Kubernetes ; une seule route de santé par service. | `US.md` (à valider) |
| D2 | **Contenu** : `/liveness` répond toujours `200 { "status": "ok" }`, sans toucher aucune dépendance ; `/readiness` répond `200` ou `503` avec `{ "status", "checks": { "database"?, "kafka"? } }` | Une liveness qui teste la base ferait redémarrer le pod à chaque panne de base, sans rien réparer. | `US.md` (à valider) |
| D3 | **Dépendances de `/readiness`** : core-backend = base `trading` + Kafka ; notification-service = base `notifications` + Kafka ; backtest-engine et risk-engine = Kafka ; market-service = aucune. Le fournisseur Yahoo n'en fait **pas** partie | Un fournisseur externe instable ne doit pas retirer le service du trafic. | `US.md` (à valider) |
| D4 | **Prêt côté Kafka** : consumer prêt après `GROUP_JOIN`, non prêt après `CRASH`, `STOP` ou `DISCONNECT` ; producer prêt après `CONNECT` | Le groupe peut mettre des dizaines de secondes à se rejoindre après un redémarrage (voir `index.ts` de core-backend) : le service écoute avant, mais n'est « prêt » qu'ensuite. | `US.md` (à valider) |
| D5 | **Ports des workers** : variable `HEALTH_PORT`, 8003 pour `backtest-engine`, 8004 pour `risk-engine` | Même schéma que 8000 à 8002 ; un seul listener minimal, sans Express dans les workers. | `US.md` (à valider) |
| D6 | **Calcul de l'état par `core-backend`** : `up` = `200`, `degraded` = `503` (service joignable, dépendance KO), `down` = délai dépassé ou connexion refusée | Le web affiche l'état tel quel ; deux clients montreraient le même résultat. | `US.md` (à valider) |
| D7 | **Périmètre de la page** : statuts des services uniquement ; CPU et mémoire arrivent avec Prometheus (25) ; débit des messages, topics Kafka avec lag et exécutions en cours ne sont planifiés dans aucune feature | Choix de l'utilisateur le 2026-11-18. | Décision du 2026-11-18 |
| D8 | **Numérotation** : la feature prend le numéro 16 ; les features 16 à 25 deviennent 17 à 26 (dossiers, dépendances, copies Figma `(F<NN>)`) | Respecter l'ordre d'exécution voulu, comme pour la 15 (D12). | Décision du 2026-11-18 |

## Écarts au plan

Aucun : feature planifiée, rien de livré. L'écran « Trace d'une exécution » (section Figma `Mois 11 · Observabilité`) a été supprimé le 2026-11-18 : la page Monitoring est la seule maquette de suivi, et plus aucun écran n'a besoin du bloc « Exécutions en cours ».

## Bilan

À écrire à la clôture de la feature.

## Fichiers

- [`US.md`](US.md) — user stories et critères d’acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
