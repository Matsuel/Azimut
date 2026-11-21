# fix-05 · CI sur les PR et passe de dette du 13 novembre — Tâches

> Échelle de points, statuts et définition de terminé commune : `roadmap/README.md`. Points estimés a posteriori.

## Synthèse

| Tâche | Titre | US | Couche | Priorité | Points | Dépend de | Commits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | CI : Biome et tests sur les PR vers develop | US-01 | ci | MUST | 2 | — | `77947b1` |
| T-02 | Lot atomique, tests de l'authentification et du proxy (TD-30) | US-01 | core-backend | MUST | 3 | — | `ef551a9` |
| T-03 | Unités des champs numériques des contrats (TD-34) | US-01 | contracts | MUST | 1 | — | `2c0379e` |
| T-04 | verify ignore .env.example | US-01 | outillage | MUST | 1 | — | `d059d35` |

**Total** : 7 points — MUST 7, SHOULD 0.

| Lot | Tâches | Points |
| --- | --- | --- |
| 1. Qualité | T-01 → T-04 | 7 |

**Chemin critique** : aucun, tâches indépendantes.

**Parallélisable** : toutes.

---

## Lot 1 — Qualité

### T-01 · CI : Biome et tests sur les PR vers develop

- **US** : US-01 · **Priorité** : MUST · **Points** : 2 · **Dépend de** : — · **Commits** : `77947b1`
- **Fichiers** : `.github/workflows`

Critères d'acceptation :
- [x] Workflow actif.

### T-02 · Lot atomique, tests de l'authentification et du proxy (TD-30)

- **US** : US-01 · **Priorité** : MUST · **Points** : 3 · **Dépend de** : — · **Commits** : `ef551a9`
- **Fichiers** : `apps/core-backend`

Critères d'acceptation :
- [x] TD-30 fermée.

### T-03 · Unités des champs numériques des contrats (TD-34)

- **US** : US-01 · **Priorité** : MUST · **Points** : 1 · **Dépend de** : — · **Commits** : `2c0379e`
- **Fichiers** : `packages/contracts`

Critères d'acceptation :
- [x] TD-34 fermée.

### T-04 · verify ignore .env.example

- **US** : US-01 · **Priorité** : MUST · **Points** : 1 · **Dépend de** : — · **Commits** : `d059d35`
- **Fichiers** : `scripts/verify`

Critères d'acceptation :
- [x] Pas de faux positif.
