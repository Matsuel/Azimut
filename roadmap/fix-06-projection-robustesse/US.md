# fix-06 · Robustesse de la projection Monte Carlo — User stories

> Sources : commits listés dans `TASKS.md` (rétro).

## Hors périmètre

- Le suivi `docs(roadmap)` et `docs(tech-debt)` de la période.

---

## User stories

### Lot 1 — Correctifs

#### US-01 · Projection jamais bloquée — MUST

**En tant que** développeur du projet, **je veux** projection jamais bloquée **afin de** garder la feature voisine conforme aux règles du dépôt.

Critères d'acceptation :
- [x] Une projection en attente expire après 10 min.
- [x] Un calcul bloqué peut être relancé depuis le web.
- [x] Le contrat accepte un résultat sans `durationMs`.
- [x] Les axes compactent les graduations à partir du million.

Tâches : T-01, T-02, T-03, T-04 (détail dans `TASKS.md`).

---

## Récapitulatif

| US | Titre | Priorité | Lot | Couches |
| --- | --- | --- | --- | --- |
| US-01 | Projection jamais bloquée | MUST | 1 | contracts, core-backend, web |
