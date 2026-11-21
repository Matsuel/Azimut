# fix-02 · Navigation, proxy et primitives shadcn du web

- **Statut** : Livrée
- **Roadmap** : hors roadmap annuelle — correctif après la feature 09
- **Période** : 2026-11-01 → 2026-11-02
- **Branche / PR** : commits directs sur `develop`
- **Points** : 7 — estimés a posteriori
- **Maquettes** : aucune
- **Écrans modifiés** : aucun

## Objectif

Le shell de l'application web (navigation, proxy, onglets) est cohérent : plus d'onglet non câblé, et les écrans existants utilisent les primitives shadcn.

## Comment

`c06774a` corrige la navigation, le proxy et le shell ; `8035b1d` retire les onglets Marché non câblés et l'onglet trade vide ; `8208c06` applique la règle « shadcn d'abord » aux écrans déjà écrits (audit web du 2026-11-01).

## Décisions

Aucune décision structurante.

## Écarts au plan

Aucun : correctif hors plan, classé a posteriori.

## Bilan

Corrige des écarts relevés par l'audit web ; les règles associées sont dans `apps/web/AGENTS.md`. Points estimés a posteriori d'après les diffs.

## Fichiers

- [`US.md`](US.md) — user story et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
