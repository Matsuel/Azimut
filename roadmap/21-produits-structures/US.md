# 21 · Produits structurés : décomposition, juste valeur, marge — User stories

> Sources : README racine : Structuration, produits structurés (roadmap mois 10) ; `roadmap/README.md` (limites des données).

## Point de départ

| Couche | Existant | Manque |
| --- | --- | --- |
| `packages/contracts/` | `pricing.ts` (17 à 20). | `structured.ts`. |
| `apps/backtest-engine/engine/` | `bonds.ts`, `options.ts`, `pricing-mc.ts`. | `structured.ts`, `structured-mc.ts`. |
| `apps/web/src/features/` | Aucun dossier produit structuré. | `structured/`. |

## Hors périmètre

- Change entre sous-jacents de devises différentes (D13).
- Coûts de couverture et de financement de l'émetteur (hypothèses non modélisées).
- Émission réelle, prospectus, conformité (hors périmètre global).
- Stress et term sheet (22).

## Décisions à valider

| # | Sujet | Proposition | Raison |
| --- | --- | --- | --- |
| D1 | Types livrés | Capital garanti, reverse convertible, autocallable | Les trois couvrent zéro-coupon, vente de put et barrière. Worst-of reporté (COULD). |
| D2 | Participation | Calculée par le moteur : budget d'option divisé par le prix du call | Formule simple et lisible : elle montre le compromis garantie / participation. |
| D3 | Autocallable | Monte Carlo avec dates d'observation | Un autocallable n'a pas de formule fermée. |
| D4 | Marge | Prix client − juste valeur, en devise et en % | Affiche la rémunération sans la faire passer pour un conseil. Hypothèses de financement et de couverture non incluses. |
| D5 | Prix client | Nominal à 100 %, marge = 100 % − juste valeur | Validée le 2026-11-14. |
| D6 | Autocallable | Observation annuelle, rappel ≥ 100 % (coupon cumulé), barrière 60 %, 5 ans ; niveaux modifiables | Validée le 2026-11-14. |
| D12 | Marge cible | Prix client calculé pour viser la marge saisie (remplace D5) | Validée le 2026-11-25. |
| D13 | Panier | 2 à 5 sous-jacents, worst-of / best-of / moyenne, corrélations historiques | Validée le 2026-11-25. |
| D14 | Niveaux | Nominal en devise, niveaux en prix | Validée le 2026-11-25. |
| D15 | Architecture | Pas de nouveau service | Validée le 2026-11-25. |
| D16 | Volatilité | Implicite préremplie (feature 19) | Validée le 2026-11-25. |
| D17 | Financement | Spread de l'émetteur en points de base | Validée le 2026-11-25. |
| D18 | Autocallable | Fréquence, coupon mémoire, non-rappel | Validée le 2026-11-25. |
| D19 | Parcours | Six étapes, navigation libre, InfoHint par champ et résultat | Validée le 2026-11-25. |
| D20 | Risque | Delta, vega, corrélation, marge nette de couverture | Validée le 2026-11-25. |
| D21 | UI | Réutiliser les composants des features 13 et 17 à 20 | Validée le 2026-11-25. |
| D22 | Persistance | Table `StructuredProduct` dédiée (remplace D8) | Validée le 2026-11-25. |
| D23 | Cycle de vie | Brouillon modifiable, émis figé | Validée le 2026-11-25. |
| D24 | Évolution | Revalorisation datée et vie du produit | Validée le 2026-11-25. |
| D25 | Suivi | Automatique, opt-in, job quotidien, alertes | Validée le 2026-11-25. |
| D26 | Maquette | Variantes de l'étape 3, FilterTabs, 90 instantanés, repères d'événements | Validée le 2026-11-25. |

---

## User stories

### Lot 1 — Moteur

#### US-01 · Décomposer un capital garanti — MUST

**En tant que** utilisateur, **je veux** voir comment un capital garanti est fabriqué à partir d'un zéro-coupon et d'un call **afin de** comprendre d'où vient la participation à la hausse..

Critères d’acceptation :
- [ ] La décomposition, la participation et le budget d'option sont affichés.
- [ ] Le total des briques égale le prix du produit.

Tâches : T-01, T-04, T-05, T-06, T-07 (détail dans `TASKS.md`).

---

#### US-02 · Voir la marge du structureur — MUST

**En tant que** utilisateur, **je veux** comparer le prix client à la juste valeur **afin de** comprendre la rémunération de celui qui vend le produit..

Critères d’acceptation :
- [ ] Juste valeur, prix client et marge sont affichés.
- [ ] La marge est calculée par le backend.

Tâches : T-01, T-03, T-04, T-05, T-06 (détail dans `TASKS.md`).

---

#### US-03 · Pricer un autocallable — MUST

**En tant que** utilisateur, **je veux** pricer un produit à remboursement anticipé **afin de** voir comment les dates d'observation et la barrière changent le prix..

Critères d’acceptation :
- [ ] Le prix autocallable est affiché avec son erreur standard.
- [ ] Les dates d'observation et la barrière sont saisies et affichées.

Tâches : T-02, T-03, T-04, T-05 (détail dans `TASKS.md`).

---

### Lot 2 — Contrat

### Lot 3 — Service

### Lot 4 — Écrans

### Lot 5 — Évolution : panier et marge cible

Livré en cinq PR (5a à 5e), voir `TASKS.md` : 5a fondations moteur, 5b parcours six étapes et risque, 5c vie du produit, 5d mes produits, 5e suivi automatique.

**Maquette validée le 2026-11-27** : `39 · Constructeur de produit v3 (parcours)`, six étapes, section Figma `465:13337` : 1 Besoin `709:18263`, 2 Sous-jacents `709:18841`, 3 Payoff `709:19436`, 4 Marché `710:18039`, 5 Marge `710:18669`, 6 Résultat `710:19256`. Fiche Émis `714:19590` (renommage `715:19659`, plafond `714:20189`), fiche Remboursé `724:19246`, brouillon `714:19056`, liste `39.1` `712:18645` et `712:19330` (à confirmer avec T-24). Capital garanti et reverse convertible restent des variantes de l'étape 3 sans cadre dédié (D26).

#### US-04 · Viser une marge cible — MUST

**En tant que** structureur, **je veux** saisir la marge que je vise **afin de** voir le prix client et la condition que je peux offrir (participation ou coupon).

Critères d’acceptation :
- [ ] La marge cible est une entrée ; le prix client, la participation ou le coupon sont des sorties du backend.
- [ ] Une marge cible inatteignable (coupon ou participation négatifs) est refusée avec un message clair.

Tâches : T-09, T-10, T-11b, T-12b, T-14.

---

#### US-05 · Structurer sur un panier de sous-jacents — MUST

**En tant que** structureur, **je veux** choisir 2 à 5 sous-jacents et un mode (worst-of, best-of, moyenne) **afin de** voir l'effet de la corrélation sur la juste valeur.

Critères d’acceptation :
- [ ] Les corrélations utilisées sont affichées ; le mode change le prix.
- [ ] Un panier à un seul sous-jacent donne le même prix qu'avant.

Tâches : T-08, T-10, T-11a, T-11b, T-12a, T-12b, T-13, T-14.

---

#### US-06 · Saisir un produit en devise et en niveaux de prix — MUST

**En tant que** structureur, **je veux** saisir un nominal en devise et des niveaux (strike, barrière, coupon) en prix **afin de** décrire un produit réel.

Critères d’acceptation :
- [ ] Le moteur ramène les niveaux en % du niveau initial ; le web n'effectue aucune conversion.
- [ ] La juste valeur, la marge et le payoff sont affichés en devise.

Tâches : T-08, T-10, T-11a, T-11b, T-12a, T-12b, T-13, T-14.

---

#### US-07 · Régler un autocallable comme un structureur — MUST

**En tant que** structureur, **je veux** régler la fréquence d'observation, le coupon mémoire, le spread de financement **afin de** voir l'effet de chaque paramètre sur le coupon offert.

Critères d’acceptation :
- [ ] Les trois paramètres sont des entrées ; le coupon et la marge se recalculent côté backend.

Tâches : T-15.

---

#### US-08 · Voir le risque du produit — MUST

**En tant que** structureur, **je veux** voir le delta, le vega et la sensibilité à la corrélation, puis la marge nette de couverture **afin de** juger si ma marge tient après couverture.

Critères d’acceptation :
- [ ] Le risque est calculé par le backend et affiché à l'étape Résultat.

Tâches : T-17, T-18.

---

#### US-09 · Gérer mes produits structurés — MUST

**En tant que** structureur, **je veux** enregistrer un produit, le retrouver, le rouvrir, le modifier tant qu'il est brouillon, l'émettre ou le supprimer **afin de** gérer mon portefeuille de produits.

Critères d’acceptation :
- [ ] Un produit émis n'est plus modifiable (D23) ; il se duplique en brouillon.
- [ ] Chaque utilisateur ne voit que ses produits.

Tâches : T-20, T-21a, T-22, T-24.

---

#### US-10 · Suivre l'évolution et la vie d'un produit — MUST

**En tant que** structureur, **je veux** revaloriser un produit émis et voir ses observations, sa barrière et son rappel **afin de** suivre sa valeur, son risque et les événements de son contrat.

Critères d’acceptation :
- [ ] Les instantanés sont datés et affichés en courbe ; la vie du produit est calculée par le backend.

Tâches : T-19a, T-19b, T-20, T-21b, T-23, T-24.

---

#### US-11 · Suivre un produit automatiquement — MUST

**En tant que** structureur, **je veux** activer un suivi automatique d'un produit émis **afin de** voir son évolution et être prévenu des événements de son contrat sans agir.

Critères d’acceptation :
- [ ] Un instantané quotidien est ajouté aux produits suivis ; un événement du contrat crée une notification, une seule fois.

Tâches : T-25, T-26.

---

## Récapitulatif

| US | Titre | Priorité | Lot | Couches |
| --- | --- | --- | --- | --- |
| US-01 | Décomposer un capital garanti | MUST | 1 | backtest-engine, contracts, core-backend, web |
| US-02 | Voir la marge du structureur | MUST | 1 | backtest-engine, contracts, core-backend, web |
| US-03 | Pricer un autocallable | MUST | 1 | backtest-engine, contracts, core-backend |
| US-04 | Viser une marge cible | MUST | 5a, 5b | backtest-engine, contracts, core-backend, web |
| US-05 | Structurer sur un panier | MUST | 5a, 5b | backtest-engine, contracts, core-backend, web |
| US-06 | Nominal en devise, niveaux en prix | MUST | 5a, 5b | backtest-engine, contracts, core-backend, web |
| US-07 | Régler un autocallable | MUST | 5a | backtest-engine, contracts, core-backend, web |
| US-08 | Voir le risque du produit | MUST | 5b | backtest-engine, contracts, core-backend, web |
| US-09 | Gérer mes produits structurés | MUST | 5d | contracts, core-backend, web |
| US-10 | Suivre l'évolution et la vie d'un produit | MUST | 5c, 5d | backtest-engine, contracts, core-backend, web |
| US-11 | Suivre un produit automatiquement | MUST | 5e | core-backend, web |
