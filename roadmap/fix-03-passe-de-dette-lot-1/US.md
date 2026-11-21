# fix-03 · Passe de dette : proxy, limites de débit et démarrage — User stories

> Sources : commits listés dans `TASKS.md` (rétro).

## Hors périmètre

- Le suivi `docs(roadmap)` et `docs(tech-debt)` de la période.

---

## User stories

### Lot 1 — Backend

#### US-01 · Backend durci selon le registre de dette — MUST

**En tant que** développeur du projet, **je veux** backend durci selon le registre de dette **afin de** garder la feature voisine conforme aux règles du dépôt.

Critères d'acceptation :
- [x] Les limites de débit ne bloquent plus les routes de lecture légères.
- [x] L'API écoute avant la connexion Kafka.
- [x] Le proxy market n'expose que les routes en liste blanche.
- [x] Le formulaire plafonne les allocations ; `TRUST_PROXY` configure les limites.

Tâches : T-01, T-02, T-03, T-04, T-05 (détail dans `TASKS.md`).

---

## Récapitulatif

| US | Titre | Priorité | Lot | Couches |
| --- | --- | --- | --- | --- |
| US-01 | Backend durci selon le registre de dette | MUST | 1 | core-backend, transverse |
