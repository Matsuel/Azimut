# 16 · Monitoring : sondes de santé et page d'état des services — User stories

> Sources : demande du 2026-11-18 (page Monitoring et routes `/liveness` / `/readiness` avant Kubernetes) ; README racine, « Observabilité » (health checks `liveness` et `readiness` distincts) ; maquette `09 · Monitoring`.

## Point de départ

| Couche | Existant | Manque |
| --- | --- | --- |
| `packages/contracts/src/` | Contrats par domaine, `INTERNAL_KEY_HEADER`. | `monitoring.ts` (états, sonde, services surveillés). |
| `packages/http/src/` | `errorMiddleware`, erreurs HTTP, `route.ts`. | `probes.ts` : route Express et serveur de sondes pour les workers. |
| `packages/kafka/src/` | `KafkaConsumer`, `KafkaProducer` (`kafkajs`), sans état exposé. | `isReady()` d'après les événements `kafkajs`. |
| `apps/core-backend` | `GET /health` dans `index.ts` (`isDbConnected`, `503 { status: "unavailable" }`) ; plugin `admin()` de `better-auth` ; `authMiddleware` sans contrôle de rôle ; `utils/proxy.ts`. | `/liveness`, `/readiness` (base + Kafka) ; `requireAdmin` ; `monitoring.service` ; `GET /api/admin/monitoring/services`. |
| `apps/market-service` | `GET /health` (`200 { status: "ok" }`), avant `internalAuthMiddleware`. | `/liveness` et `/readiness` à la place. |
| `apps/notification-service` | `GET /health` identique ; consumer Kafka ; base `notifications`. | `/liveness` et `/readiness` (base + Kafka). |
| `apps/backtest-engine`, `apps/risk-engine` | Workers Kafka sans serveur HTTP. | Serveur de sondes (`HEALTH_PORT`), `/liveness` et `/readiness` (Kafka). |
| `apps/web` | `app/app/(admin)/monitoring/page.tsx` : `PageHeader` seul ; `routes.monitoring`, entrée de sidebar `adminOnly`. | `features/monitoring/` : tableau d'état, rafraîchissement 15 s, libellés FR / EN, `COMPONENTS.md`. |
| `apps/web/e2e` | `fake-market.ts` répond à `/health`. | Réponse à `/readiness`, test de la page. |

## Hors périmètre

- CPU et mémoire par service (Prometheus, feature 25).
- Débit des messages, topics Kafka et lag des consumer groups, exécutions en cours (blocs de l'écran 09 retirés ; aucune feature ne les planifie).
- Historique des états, alertes et notifications de panne.
- Lignes `postgres` et `kafka` du tableau de la maquette : leur état se lit dans les dépendances de chaque service, pas comme services à part.
- Colonne « Inst. » (nombre de répliques) : Kubernetes (24).
- Déclaration des probes dans les charts Helm (24, qui consomme les routes livrées ici).

## Décisions (validées le 2026-11-19)

| # | Sujet | Proposition | Raison |
| --- | --- | --- | --- |
| D1 | Routes | `GET /liveness` et `GET /readiness` à la racine, sans auth, sur les cinq services ; `/health` supprimé (rupture, `e2e` et docs mis à jour) | Noms demandés ; une seule route de santé par service. |
| D2 | Contenu | Liveness toujours `200`, sans dépendance ; readiness `200` / `503` avec `checks` | Une liveness qui dépend de la base ferait redémarrer le pod pour rien. |
| D3 | Dépendances de la readiness | core-backend : base + Kafka ; notification-service : base + Kafka ; engines : Kafka ; market-service : fournisseur Yahoo | Savoir si Yahoo répond (modifiée le 2026-11-19). |
| D9 | Synthèse | `summary` calculé par core-backend (compteurs, services hors ligne) | Cartes de la maquette = totaux. |
| D10 | Contrôle de Yahoo | Requête légère, délai 1,5 s, résultat gardé 60 s | Pas d'appel au fournisseur à chaque sonde. |
| D4 | Prêt côté Kafka | Consumer prêt après `GROUP_JOIN`, non prêt après `CRASH` / `STOP` / `DISCONNECT` | L'entrée dans le groupe peut durer des dizaines de secondes. |
| D5 | Workers | `HEALTH_PORT` : 8003 (`backtest-engine`), 8004 (`risk-engine`), serveur `node:http` | Pas d'Express dans les workers. |
| D6 | État affiché | `up` (`200`), `degraded` (`503`), `down` (délai de 2 s ou refus), calculé par core-backend | Le web ne calcule pas de valeur métier. |
| D7 | Périmètre | Statuts des services uniquement | Décision du 2026-11-18. |
| D8 | Numérotation | Feature 16 ; anciennes 16 à 25 → 17 à 26 | Ordre d'exécution voulu. |

---

## User stories

### Lot 1 — Sondes

#### US-01 · Sondes de vivacité et de disponibilité sur chaque service — MUST

**En tant que** développeur, **je veux** que chaque service expose `GET /liveness` et `GET /readiness` **afin que** Kubernetes et la page Monitoring lisent le même état.

Critères d’acceptation :
- [ ] Les cinq services (`core-backend`, `market-service`, `notification-service`, `backtest-engine`, `risk-engine`) répondent `200 { "status": "ok" }` sur `/liveness`, sans clé interne ni session.
- [ ] `/readiness` répond `200` quand les dépendances de la décision D3 sont prêtes, sinon `503` avec `checks` indiquant laquelle est en panne (`"ok"` ou `"down"`).
- [ ] Quand Yahoo ne répond pas, la readiness de `market-service` passe à `503` avec `provider: down` ; le fournisseur est interrogé au plus une fois par minute par les sondes.
- [ ] Sans broker Kafka, la readiness de `core-backend`, `notification-service`, `backtest-engine` et `risk-engine` passe à `503` ; la liveness reste à `200`.
- [ ] Les workers répondent sur `HEALTH_PORT` alors qu'ils n'écoutaient aucun port avant.
- [ ] `GET /health` n'existe plus nulle part ; `API.md`, `AGENTS.md` et `apps/web/e2e/fake-market.ts` sont à jour.
- [ ] Le contrat (`monitoring.ts`) documente les états et la forme de `checks`.

Tâches : T-01, T-02, T-03, T-04, T-05, T-06 (détail dans `TASKS.md`).

---

### Lot 2 — Agrégation

#### US-02 · Voir l'état des services (administrateur) — MUST

**En tant qu’** administrateur, **je veux** une page Monitoring qui liste l'état de chaque service et de ses dépendances **afin de** savoir tout de suite quel service est en panne.

Critères d’acceptation :
- [ ] `GET /api/admin/monitoring/services` renvoie `401` sans session, `403` pour un compte non administrateur, et pour un administrateur une ligne par service : nom, état (`up` / `degraded` / `down`), dépendances, latence en millisecondes, horodatage de la vérification.
- [ ] Un service arrêté apparaît `down` sans bloquer la réponse au-delà de 2 s ; un service dont la base est coupée apparaît `degraded` avec `database: down`.
- [ ] La réponse porte une synthèse (services disponibles sur le total, dégradés, hors ligne avec leurs noms) calculée par core-backend.
- [ ] La page Monitoring (copie `09 · Monitoring · à modifier (F16)` : quatre cartes de synthèse et une carte par service) affiche ces valeurs, se rafraîchit toutes les 15 s et ne calcule aucun état.
- [ ] Titres, libellés et états sont dans `messages/fr.json` et `messages/en.json`.
- [ ] Un compte non administrateur ne voit ni l'entrée de sidebar ni la page (redirection existante, feature 04).

Tâches : T-07, T-08, T-09, T-10, T-11, T-13 (détail dans `TASKS.md`).

---

### Lot 3 — Raccordement à Kubernetes

#### US-03 · Kubernetes réutilise les sondes sans les réécrire — MUST

**En tant que** développeur, **je veux** que la feature Kubernetes référence les routes livrées ici **afin de** ne pas redéfinir deux fois les probes.

Critères d’acceptation :
- [ ] La feature 24 liste la 16 dans « Dépend de » et ne planifie plus que la configuration des probes dans les charts (`/liveness`, `/readiness`, port du service).
- [ ] Le `roadmap/README.md` (index, journal des décisions) et le `README.md` racine citent la feature 16 et la nouvelle numérotation.

Tâches : T-12 (détail dans `TASKS.md`).

---

## Récapitulatif

| US | Titre | Priorité | Lot | Couches |
| --- | --- | --- | --- | --- |
| US-01 | Sondes de vivacité et de disponibilité sur chaque service | MUST | 1 | contracts, http, kafka, backend, workers |
| US-02 | Voir l'état des services (administrateur) | MUST | 2 | contracts, backend, maquette, web, e2e |
| US-03 | Kubernetes réutilise les sondes sans les réécrire | MUST | 3 | documentation |
