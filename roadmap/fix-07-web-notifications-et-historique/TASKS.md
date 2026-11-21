# fix-07 · Ajustements web après les notifications — Tâches

> Échelle de points, statuts et définition de terminé commune : `roadmap/README.md`. Points estimés a posteriori.

## Synthèse

| Tâche | Titre | US | Couche | Priorité | Points | Dépend de | Commits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | cn connaît les tailles de texte du thème | US-01 | web | MUST | 1 | — | `14f568e` |
| T-02 | Historique du backtest remonté à l'arrivée du résultat | US-01 | web | MUST | 2 | — | `fcc087d` |
| T-03 | Compteur de notifications lisible au survol | US-01 | web | MUST | 1 | — | `9e7eb38` |

**Total** : 4 points — MUST 4, SHOULD 0.

| Lot | Tâches | Points |
| --- | --- | --- |
| 1. Web | T-01 → T-03 | 4 |

**Chemin critique** : aucun, tâches indépendantes.

**Parallélisable** : toutes.

---

## Lot 1 — Web

### T-01 · cn connaît les tailles de texte du thème

- **US** : US-01 · **Priorité** : MUST · **Points** : 1 · **Dépend de** : — · **Commits** : `14f568e`
- **Fichiers** : `apps/web/src/lib/utils.ts`

Critères d'acceptation :
- [x] Tailles préservées.

### T-02 · Historique du backtest remonté à l'arrivée du résultat

- **US** : US-01 · **Priorité** : MUST · **Points** : 2 · **Dépend de** : — · **Commits** : `fcc087d`
- **Fichiers** : `apps/web`

Critères d'acceptation :
- [x] Mise à jour sans rechargement.

### T-03 · Compteur de notifications lisible au survol

- **US** : US-01 · **Priorité** : MUST · **Points** : 1 · **Dépend de** : — · **Commits** : `9e7eb38`
- **Fichiers** : `apps/web`

Critères d'acceptation :
- [x] Contraste au survol.
