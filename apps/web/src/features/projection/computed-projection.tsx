import { ProjectionFanChart } from "./projection-fan-chart"
import { ProjectionParams } from "./projection-params"
import { ProjectionPercentiles } from "./projection-percentiles"
import { ProjectionStats } from "./projection-stats"
import type { Projection } from "./types"

type ComputedProjectionProps = { projection: Projection; horizon: number; onHorizonChange: (horizon: number) => void }

/** Projection calculée : cartes, éventail, paramètres et percentiles de l'horizon choisi (sélection de `years`, aucun calcul). */
export function ComputedProjection({ projection, horizon, onHorizonChange }: ComputedProjectionProps) {
    // Sélection de l'année de l'horizon : le backend a déjà calculé chaque année
    const year = projection.years[horizon - 1] ?? projection.years.at(-1)
    if (!year) return null
    return (
        <>
            <ProjectionStats year={year} capital={projection.capital} />
            <ProjectionFanChart
                points={projection.points}
                capital={projection.capital}
                horizonYears={year.years}
                paths={projection.paths}
                year={year}
            />
            <div className="grid gap-6 xl:grid-cols-2">
                <ProjectionParams projection={projection} horizon={horizon} onHorizonChange={onHorizonChange} />
                <ProjectionPercentiles years={projection.years} horizonYears={year.years} />
            </div>
        </>
    )
}
