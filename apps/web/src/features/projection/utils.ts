import { RESULT_POLL_MS } from "@/features/backtest/constants"
import { type BacktestTranslator, formatSeconds } from "@/features/backtest/utils"
import type { Formatters } from "@/lib/format"
import type { ProjectionView } from "./types"

/**
 * Durée du calcul de la projection reçue en millisecondes (conversion d'unité), au format de la page backtest : « 0,7 s »
 * sous une minute (une décimale), « 1 min 5 s » au-delà.
 */
export function formatComputationDuration(f: Formatters, t: BacktestTranslator, durationMs: number) {
    const seconds = durationMs / 1000
    return seconds < 60
        ? t("duration.seconds", { seconds: f.formatDecimal1(seconds) })
        : formatSeconds(t, Math.round(seconds))
}

/**
 * Intervalle de rafraîchissement de la projection (ms) : `RESULT_POLL_MS` tant que `projection.completed` est attendu,
 * `false` sinon. Attendu : état « PENDING », ou « UNAVAILABLE » avec un calcul en cours dans l'historique (première
 * exécution sans résultat encore). Aucune horloge : le serveur passe un calcul bloqué en « UNAVAILABLE ».
 */
export function projectionPollMs(view: ProjectionView): number | false {
    const awaited =
        view.state === "PENDING" ||
        (view.state === "UNAVAILABLE" && view.history.some((run) => run.state === "PENDING"))
    return awaited ? RESULT_POLL_MS : false
}
