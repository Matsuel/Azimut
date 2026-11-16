import { type BacktestTranslator, formatSeconds } from "@/features/backtest/utils"
import type { Formatters } from "@/lib/format"

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
