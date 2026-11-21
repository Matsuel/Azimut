# fix-02 · Navigation, proxy et primitives shadcn du web — Tâches

> Échelle de points, statuts et définition de terminé commune : `roadmap/README.md`. Points estimés a posteriori.

## Synthèse

| Tâche | Titre | US | Couche | Priorité | Points | Dépend de | Commits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | Navigation, proxy et app shell | US-01 | web | MUST | 3 | — | `c06774a` |
| T-02 | Retirer les onglets Marché non câblés et l'onglet trade vide | US-01 | web | MUST | 1 | — | `8035b1d` |
| T-03 | Appliquer shadcn d'abord aux écrans existants | US-01 | web | MUST | 3 | — | `8208c06` |

**Total** : 7 points — MUST 7, SHOULD 0.

| Lot | Tâches | Points |
| --- | --- | --- |
| 1. Web | T-01 → T-03 | 7 |

**Chemin critique** : aucun, tâches indépendantes.

**Parallélisable** : toutes.

---

## Lot 1 — Web

### T-01 · Navigation, proxy et app shell

- **US** : US-01 · **Priorité** : MUST · **Points** : 3 · **Dépend de** : — · **Commits** : `c06774a`
- **Fichiers** : `apps/web`

Critères d'acceptation :
- [x] La navigation et le proxy fonctionnent.

### T-02 · Retirer les onglets Marché non câblés et l'onglet trade vide

- **US** : US-01 · **Priorité** : MUST · **Points** : 1 · **Dépend de** : — · **Commits** : `8035b1d`
- **Fichiers** : `apps/web/src/features/market`

Critères d'acceptation :
- [x] Aucun onglet mort.

### T-03 · Appliquer shadcn d'abord aux écrans existants

- **US** : US-01 · **Priorité** : MUST · **Points** : 3 · **Dépend de** : — · **Commits** : `8208c06`
- **Fichiers** : `apps/web/src`

Critères d'acceptation :
- [x] Plus d'élément HTML brut là où une primitive existe.
