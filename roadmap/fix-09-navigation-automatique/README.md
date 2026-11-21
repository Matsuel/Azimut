# fix-09 · Navigation automatique et pages d'index de section

- **Statut** : Livrée
- **Roadmap** : hors roadmap annuelle — correctif placé après la feature 18 (demande du 2026-11-21)
- **Période** : 2026-11-21 → 2026-11-21
- **Branche / PR** : `fix/navigation-automatique`
- **Points** : 24 (MUST 24) — réalisés 24
- **Maquettes** : `41 · Index de section · Laboratoire` (654:15048), `41.1 · Index de section · Analyse` (654:15600), `42 · Navigation · sidebar et fil d’Ariane` (655:15385) — validées le 21/11/2026
- **Écrans modifiés** : `Sidebar` (titre de section cliquable, sans style de lien ni soulignement) : copie `35 · Taux et obligations · à modifier (fix-09)` (655:15554) — dessiné dans la copie ; `Fil d’Ariane` (maillon de section cliquable ; maillon seul sur la page d'index) : mêmes copies ; `06 · Paramètres · Profil` (node `18:2065`, fil sans maillon de section) : copie `06 · Paramètres · Profil · à modifier (fix-09)` (655:15884) — dessiné dans la copie

## Objectif

La navigation (sidebar, fil d'Ariane, menu du profil) vient d'une source unique, et un test échoue si une page statique n'y est pas rattachée. Un clic sur un titre de section (Laboratoire, Analyse…) ouvre une page qui liste les onglets de la section sous forme de cartes.

## Comment

`constants/sidebar.tsx` exporte `userTabs` en plus de `sidebarSections` ; `lib/navigation.ts` (`findActiveTab`, `findSectionPage`) les lit ; `nav-user.tsx` génère le menu depuis `userTabs`. La page `app/app/sections/[section]/page.tsx` est fine : `requireSession`, garde admin partagée avec `(admin)/layout.tsx`, `notFound()` si section inconnue ou `adminOnly` pour un non-admin. La langue vient du cookie `locale`, jamais de l'URL : les chemins sont identiques en FR et EN.

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | Numéro `fix-09` : les fix rétro `fix-01` à `fix-08` passent avant. | Numérotation chronologique (`roadmap/README.md`). | `roadmap/README.md` |
| D2 | Le titre de section reste visuellement inchangé (ni soulignement, ni couleur de survol). | Demande du 2026-11-21. | Maquette 42 |
| D3 | `navigation.account` devient `navigation.tabs.account`. | Le menu du profil est un onglet de `userTabs`. | `US.md` |
| D4 | Section `adminOnly` : 404 pour un non-admin. | Même garde que `(admin)/layout.tsx`. | `US.md` |
| D5 | Fil d'Ariane de la page Paramètres : maillon seul, sans section, libellé « Compte » (`tabs.account`). | `userTabs` est la source unique ; la copie Figma montrait « Paramètres ». | `624a4b1` |
| D6 | Composant `SectionIndex` rangé dans `components/` avec les autres composants partagés, `SectionCard` dans la section Figma « Composants · suite ». | Demande du 2026-11-21. | `d105ec4` |

## Écarts au plan

- Libellé du fil d'Ariane de Paramètres : « Compte » dans le code, « Paramètres » dans la copie Figma 06 (D5).
- Grille responsive 1 / 2 / 3 colonnes (maquette : 3 colonnes sur desktop).

## Bilan

Livré : source unique `userTabs` + `sidebarSections`, test de garde `sidebar.test.ts`, pages `/app/sections/<clé>` (404 si inconnue ou `adminOnly` pour un non-admin), titres de section et maillon du fil d'Ariane liés sans style de lien, dictionnaires FR/EN typés, E2E de navigation. Hors-périmètre corrigé : `rates.e2e.ts` cassé par la note de la page Taux. Dette : aucune. 24 points réalisés pour 24 prévus.

## Fichiers

- [`US.md`](US.md) — user stories et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
