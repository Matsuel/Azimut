# fix-09 · Navigation automatique et pages d'index de section — User stories

> Sources : demande du 2026-11-21, maquettes `41`, `41.1`, `42` (Figma `Trading`, section « Fix 09 · Navigation automatique (41–42) »), validées le 21/11/2026.

## Point de départ

| Couche | Existant | Manque |
| --- | --- | --- |
| `constants/sidebar.tsx` | `sidebarSections` (sidebar et fil d'Ariane) | `userTabs` |
| `lib/navigation.ts` | `findActiveTab`, `ActiveTab.section` obligatoire | `findSectionPage`, section optionnelle |
| `components/nav-user.tsx` | `routes.settings` en dur, `t("account")` | menu généré depuis `userTabs` |
| `components/sidebar-nav.tsx`, `app-header.tsx` | titre de section en texte | liens vers la page d'index |
| `messages/*.json` | `navigation.account`, `tabs`, `sections` | `tabs.account`, `descriptions`, `sectionDescriptions` |

## Hors périmètre

- Refactor de la sidebar hors de ce qui est décrit ; nouvelle dépendance.
- Style de lien sur les titres de section (jamais de soulignement ni de couleur de survol).

## Décisions à valider

Voir `README.md` (D1 à D5).

**Maquettes** : `41` (index Laboratoire, validée le 21/11/2026), `41.1` (index Analyse, 4 cartes, proposée), `42` (états sidebar et fil d'Ariane, proposée).

---

## User stories

### Lot 1 — Source unique

#### US-01 · Menu du profil et garde de navigation — MUST

**En tant que** développeur, **je veux** que le menu du profil vienne de la même source que la sidebar **afin de** ne jamais oublier une page.

Critères d'acceptation :
- [x] `nav-user.tsx` génère ses liens depuis `userTabs`, sans `routes.settings` en dur.
- [x] `findActiveTab` couvre `userTabs` ; `ActiveTab.section` est optionnelle.
- [x] `test/sidebar.test.ts` échoue si une page statique de `src/app/app/**/page.tsx` n'est rattachée à aucun onglet ni page de section.
- [x] `navigation.account` est déplacé en `navigation.tabs.account` (FR et EN, usages, tests et E2E).

Tâches : T-01, T-02, T-03.

### Lot 2 — Pages d'index

#### US-02 · Pages d'index de section — MUST

**En tant qu'** utilisateur, **je veux** cliquer sur un titre de section **afin de** voir les onglets de la section avec leur description.

Critères d'acceptation :
- [x] `/app/sections/<clé>` liste une carte par onglet (icône, titre, description) menant à la bonne page.
- [x] Section inconnue ou `adminOnly` pour un non-admin : 404.
- [x] Le titre de section de la sidebar est un lien sans aucun style de lien (ni soulignement, ni couleur).
- [x] Fil d'Ariane : maillon de section cliquable sur une page d'onglet ; maillon seul sur la page d'index ; page Paramètres sans maillon de section.
- [x] Dictionnaires FR et EN avec mêmes clés ; un onglet sans description casse `tsc`.

Tâches : T-04 à T-09.

---

## Récapitulatif

| US | Titre | Priorité | Lot | Couches |
| --- | --- | --- | --- | --- |
| US-01 | Menu du profil et garde de navigation | MUST | 1 | web |
| US-02 | Pages d'index de section | MUST | 2 | web, roadmap |
