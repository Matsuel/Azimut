# fix-08 · Correctifs après les taux et obligations — Tâches

> Échelle de points, statuts et définition de terminé commune : `roadmap/README.md`. Points estimés a posteriori.

## Synthèse

| Tâche | Titre | US | Couche | Priorité | Points | Dépend de | Commits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | Expiration PENDING et limiteur de POST /api/pricing (TD-53) | US-01 | core-backend | MUST | 3 | — | `27e7a4b` |
| T-02 | Créer les topics pricing.* au démarrage | US-01 | core-backend | MUST | 1 | — | `0e0aa30` |
| T-03 | Page Taux mesurée contre la maquette 35 | US-01 | web | MUST | 3 | — | `d3e2727` |
| T-04 | CI : générer les types Next avant tsc | US-01 | ci | MUST | 1 | — | `60bdf67` |

**Total** : 8 points — MUST 8, SHOULD 0.

| Lot | Tâches | Points |
| --- | --- | --- |
| 1. Correctifs | T-01 → T-04 | 8 |

**Chemin critique** : aucun, tâches indépendantes.

**Parallélisable** : toutes.

---

## Lot 1 — Correctifs

### T-01 · Expiration PENDING et limiteur de POST /api/pricing (TD-53)

- **US** : US-01 · **Priorité** : MUST · **Points** : 3 · **Dépend de** : — · **Commits** : `27e7a4b`
- **Fichiers** : `apps/core-backend`

Critères d'acceptation :
- [x] TD-53 fermée.

### T-02 · Créer les topics pricing.* au démarrage

- **US** : US-01 · **Priorité** : MUST · **Points** : 1 · **Dépend de** : — · **Commits** : `0e0aa30`
- **Fichiers** : `apps/core-backend`

Critères d'acceptation :
- [x] Topics créés.

### T-03 · Page Taux mesurée contre la maquette 35

- **US** : US-01 · **Priorité** : MUST · **Points** : 3 · **Dépend de** : — · **Commits** : `d3e2727`
- **Fichiers** : `apps/web/src/features/rates`

Critères d'acceptation :
- [x] Écarts mesurés corrigés ; TD-54 réduite.

### T-04 · CI : générer les types Next avant tsc

- **US** : US-01 · **Priorité** : MUST · **Points** : 1 · **Dépend de** : — · **Commits** : `60bdf67`
- **Fichiers** : `.github/workflows`

Critères d'acceptation :
- [x] CI verte.
