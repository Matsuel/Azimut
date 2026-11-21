# fix-05 · CI sur les PR et passe de dette du 13 novembre — User stories

> Sources : commits listés dans `TASKS.md` (rétro).

## Hors périmètre

- Le suivi `docs(roadmap)` et `docs(tech-debt)` de la période.

---

## User stories

### Lot 1 — Qualité

#### US-01 · PR contrôlées et dette réduite — MUST

**En tant que** développeur du projet, **je veux** pR contrôlées et dette réduite **afin de** garder la feature voisine conforme aux règles du dépôt.

Critères d'acceptation :
- [x] Une PR vers develop lance Biome et les tests.
- [x] La création d'un lot est atomique.
- [x] Chaque champ numérique du contrat porte son unité.
- [x] Le contrôle `.env` ignore `.env.example`.

Tâches : T-01, T-02, T-03, T-04 (détail dans `TASKS.md`).

---

## Récapitulatif

| US | Titre | Priorité | Lot | Couches |
| --- | --- | --- | --- | --- |
| US-01 | PR contrôlées et dette réduite | MUST | 1 | ci, core-backend, contracts, outillage |
