# Catalogue web : `features/monitoring`

Page Monitoring (feature 16, maquettes `09 · Monitoring · à modifier (F16)`, chargement et erreur), réservée aux administrateurs (groupe `(admin)`). Toutes les valeurs viennent de `GET /api/admin/monitoring/services` : état, dépendances, latence et date de chaque contrôle, synthèse. Le web ne compte rien et n'interprète aucune sonde ; il formate la latence, l'ancienneté du contrôle et l'intervalle. Gabarits d'entrée : [`COMPONENTS.md`](../../../COMPONENTS.md#gabarits).

### MonitoringOverview

- **Import** : `import { MonitoringOverview } from "@/features/monitoring/monitoring-overview"`.
- **Rôle** : corps de l'écran `routes.monitoring`, sous le `PageHeader` de la page : `MonitoringStats`, titre « Services » avec le badge « n services hors ligne » (`summary.down`, masqué à 0), grille de `ServiceCard` (1 colonne, 2 à partir de `md`, 3 à partir de `xl`). Chargement : `Skeleton` à la place des 4 cartes et des 5 cartes de service. Erreur : `Alert` destructive et bouton « Réessayer » (`refetch`). Relu toutes les `MONITORING_REFRESH_MS`.
- **Props** : aucune.
- **Source** : `src/features/monitoring/monitoring-overview.tsx`.

### MonitoringStats

- **Import** : `import { MonitoringStats } from "@/features/monitoring/stats"`.
- **Rôle** : quatre `StatCard` : services disponibles (`up / total`, aide `serviceState`), dégradés, hors ligne (noms de `downServices` en sous-titre), intervalle.
- **Props** :
  - `summary` : `summary` de la réponse.
  - `interval` : intervalle de rafraîchissement déjà formaté (« 15 s »).
- **Source** : `src/features/monitoring/stats.tsx`.

### ServiceCard

- **Import** : `import { ServiceCard } from "@/features/monitoring/service-card"`.
- **Rôle** : carte d'un service (composant Figma `ServiceCard`, node `613:14644`) : nom, badge d'état (`stateBadges`), une ligne par clé de `checks` (« OK », ou « En panne » en destructive), ou « Sonde /readiness · Sans réponse » pour un service `down` ; pied « Latence n ms » (aide `probeLatency`, `<Dash />` si `latencyMs` est `null`) et « Vérifié il y a n s ». Remplit la hauteur de sa rangée.
- **Props** :
  - `status` : `ServiceStatus` reçu.
  - `now` : instant de référence de « Vérifié il y a … » (le même pour toute la grille).
- **Source** : `src/features/monitoring/service-card.tsx`.

### `features/monitoring/api.ts`

- **Import** : `import { getMonitoringServices } from "@/features/monitoring/api"`.

| Export | Rôle (et unité) |
| --- | --- |
| `getMonitoringServices` | `GET /api/admin/monitoring/services` → `MonitoringServicesResponse` (admin seulement). |

### `features/monitoring/hook.ts`

- **Import** : `import { useMonitoringServices } from "@/features/monitoring/hook"`.

| Export | Rôle (et unité) |
| --- | --- |
| `useMonitoringServices` | Requête `["monitoring", "services"]`, relue toutes les `MONITORING_REFRESH_MS`. |

### `features/monitoring/constants.ts`

- **Import** : `import { MONITORING_REFRESH_MS, … } from "@/features/monitoring/constants"`.

| Export | Rôle (et unité) |
| --- | --- |
| `MONITORING_REFRESH_MS` | Intervalle de rafraîchissement de la page, ms (15 000). |
| `MONITORED_SERVICE_COUNT` | Nombre de cartes de service en chargement (5, miroir de `MONITORED_SERVICES` du contrat). |
| `stateBadges` | Variante de `Badge` par état : `up` → `success`, `degraded` → `secondary`, `down` → `destructive`. |
| `CHECK_KEYS` | Ordre d'affichage des dépendances : `database`, `kafka`, `provider`. |

### `features/monitoring/types.ts`

- **Import** : `import type { MonitoringServicesResponse, ServiceStatus, … } from "@/features/monitoring/types"`.

| Export | Rôle (et unité) |
| --- | --- |
| `MonitoringServicesResponse`, `ServiceStatus`, `ServiceState`, `ProbeChecks` | Réexports de `@azimut/contracts` (`monitoring.ts`) : latence en ms, `checkedAt` ISO 8601. |
