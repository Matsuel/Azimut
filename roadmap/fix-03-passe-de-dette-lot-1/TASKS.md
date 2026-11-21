# fix-03 · Passe de dette : proxy, limites de débit et démarrage — Tâches

> Échelle de points, statuts et définition de terminé commune : `roadmap/README.md`. Points estimés a posteriori.

## Synthèse

| Tâche | Titre | US | Couche | Priorité | Points | Dépend de | Commits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | Limite de débit épargne get-session et l'aperçu | US-01 | core-backend | MUST | 1 | — | `4d8bf6c` |
| T-02 | L'API écoute avant Kafka, échec de démarrage franc | US-01 | core-backend | MUST | 2 | — | `59e1fb8` |
| T-03 | Retirer les fichiers d'un ancien stash | US-01 | transverse | MUST | 1 | — | `ba272e9` |
| T-04 | Proxy market en liste blanche, DAY_MS unique, client de cours robuste | US-01 | transverse | MUST | 5 | — | `b3969f8` |
| T-05 | Plafond d'allocations du formulaire et TRUST_PROXY | US-01 | transverse | MUST | 2 | — | `ec588af` |

**Total** : 11 points — MUST 11, SHOULD 0.

| Lot | Tâches | Points |
| --- | --- | --- |
| 1. Backend | T-01 → T-05 | 11 |

**Chemin critique** : aucun, tâches indépendantes.

**Parallélisable** : toutes.

---

## Lot 1 — Backend

### T-01 · Limite de débit épargne get-session et l'aperçu

- **US** : US-01 · **Priorité** : MUST · **Points** : 1 · **Dépend de** : — · **Commits** : `4d8bf6c`
- **Fichiers** : `apps/core-backend`

Critères d'acceptation :
- [x] get-session et l'aperçu hors limite.

### T-02 · L'API écoute avant Kafka, échec de démarrage franc

- **US** : US-01 · **Priorité** : MUST · **Points** : 2 · **Dépend de** : — · **Commits** : `59e1fb8`
- **Fichiers** : `apps/core-backend/src/index.ts`

Critères d'acceptation :
- [x] Le process s'arrête franchement si Kafka échoue.

### T-03 · Retirer les fichiers d'un ancien stash

- **US** : US-01 · **Priorité** : MUST · **Points** : 1 · **Dépend de** : — · **Commits** : `ba272e9`
- **Fichiers** : `apps/web/COMPONENTS.md`

Critères d'acceptation :
- [x] COMPONENTS.md rétabli.

### T-04 · Proxy market en liste blanche, DAY_MS unique, client de cours robuste

- **US** : US-01 · **Priorité** : MUST · **Points** : 5 · **Dépend de** : — · **Commits** : `b3969f8`
- **Fichiers** : `apps/core-backend`, `apps/market-service`, `packages/*`

Critères d'acceptation :
- [x] Proxy en liste blanche, constante unique, cache et client robustes.

### T-05 · Plafond d'allocations du formulaire et TRUST_PROXY

- **US** : US-01 · **Priorité** : MUST · **Points** : 2 · **Dépend de** : — · **Commits** : `ec588af`
- **Fichiers** : `apps/web`, `apps/core-backend`

Critères d'acceptation :
- [x] TD-21 et TD-22 fermées.
