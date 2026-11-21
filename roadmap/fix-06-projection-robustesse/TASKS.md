# fix-06 · Robustesse de la projection Monte Carlo — Tâches

> Échelle de points, statuts et définition de terminé commune : `roadmap/README.md`. Points estimés a posteriori.

## Synthèse

| Tâche | Titre | US | Couche | Priorité | Points | Dépend de | Commits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | durationMs optionnel dans le contrat | US-01 | contracts | MUST | 1 | — | `82fd40f` |
| T-02 | Projection en attente expirée après 10 min | US-01 | core-backend | MUST | 2 | — | `dd22326` |
| T-03 | Relancer depuis un calcul bloqué | US-01 | web | MUST | 2 | — | `7d8bc4f` |
| T-04 | Graduations d'axe compactes à partir du million | US-01 | web | MUST | 1 | — | `6301e72` |

**Total** : 6 points — MUST 6, SHOULD 0.

| Lot | Tâches | Points |
| --- | --- | --- |
| 1. Correctifs | T-01 → T-04 | 6 |

**Chemin critique** : aucun, tâches indépendantes.

**Parallélisable** : toutes.

---

## Lot 1 — Correctifs

### T-01 · durationMs optionnel dans le contrat

- **US** : US-01 · **Priorité** : MUST · **Points** : 1 · **Dépend de** : — · **Commits** : `82fd40f`
- **Fichiers** : `packages/contracts`

Critères d'acceptation :
- [x] Déploiement sans perte.

### T-02 · Projection en attente expirée après 10 min

- **US** : US-01 · **Priorité** : MUST · **Points** : 2 · **Dépend de** : — · **Commits** : `dd22326`
- **Fichiers** : `apps/core-backend`

Critères d'acceptation :
- [x] Expiration testée.

### T-03 · Relancer depuis un calcul bloqué

- **US** : US-01 · **Priorité** : MUST · **Points** : 2 · **Dépend de** : — · **Commits** : `7d8bc4f`
- **Fichiers** : `apps/web`

Critères d'acceptation :
- [x] Bouton de relance.

### T-04 · Graduations d'axe compactes à partir du million

- **US** : US-01 · **Priorité** : MUST · **Points** : 1 · **Dépend de** : — · **Commits** : `6301e72`
- **Fichiers** : `apps/web`

Critères d'acceptation :
- [x] Axes lisibles.
