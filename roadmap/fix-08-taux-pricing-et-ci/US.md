# fix-08 · Correctifs après les taux et obligations — User stories

> Sources : commits listés dans `TASKS.md` (rétro).

## Hors périmètre

- Le suivi `docs(roadmap)` et `docs(tech-debt)` de la période.

---

## User stories

### Lot 1 — Correctifs

#### US-01 · Taux et pricing fiabilisés — MUST

**En tant que** développeur du projet, **je veux** taux et pricing fiabilisés **afin de** garder la feature voisine conforme aux règles du dépôt.

Critères d'acceptation :
- [x] Une demande PENDING expire ; POST /api/pricing est limité.
- [x] Les topics `pricing.*` sont créés au démarrage.
- [x] La page Taux correspond à la maquette 35.
- [x] La CI typecheck le web sans erreur PageProps.

Tâches : T-01, T-02, T-03, T-04 (détail dans `TASKS.md`).

---

## Récapitulatif

| US | Titre | Priorité | Lot | Couches |
| --- | --- | --- | --- | --- |
| US-01 | Taux et pricing fiabilisés | MUST | 1 | core-backend, web, ci |
