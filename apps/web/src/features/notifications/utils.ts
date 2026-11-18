import type { Formatters } from "@/lib/format"
import { routes } from "@/lib/routes"
import type { NotificationView } from "./types"

export type DayGroup = "today" | "yesterday" | "week" | "older"

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

/** Groupe d'affichage d'une notification selon son jour calendaire local : aujourd'hui, hier, moins de 7 jours, plus ancien. */
export function dayGroup(createdAt: string, now: Date): DayGroup {
    const days = Math.round((startOfDay(now) - startOfDay(new Date(createdAt))) / 86_400_000)
    if (days <= 0) return "today"
    if (days === 1) return "yesterday"
    return days < 7 ? "week" : "older"
}

/** Regroupe la page de notifications (déjà triée, la plus récente d'abord) par jour, sans changer l'ordre. */
export function groupByDay(items: NotificationView[], now: Date): { group: DayGroup; items: NotificationView[] }[] {
    const groups: { group: DayGroup; items: NotificationView[] }[] = []
    for (const item of items) {
        const group = dayGroup(item.createdAt, now)
        const last = groups.at(-1)
        if (last?.group === group) last.items.push(item)
        else groups.push({ group, items: [item] })
    }
    return groups
}

/** Page qui affiche le résultat concerné par la notification. */
export function notificationRoute(n: NotificationView): string {
    if (n.type === "RISK_CONSTRAINT_VIOLATED") return routes.backtestRisk(n.params.backtestId)
    if (n.type === "PROJECTION_COMPLETED") return routes.backtestProjection(n.params.backtestId)
    return routes.backtest(n.params.backtestId)
}

/**
 * Quand la notification est arrivée, selon son groupe : « il y a 5 min » aujourd'hui, « hier, 18:42 »,
 * puis « dim. 25/10 ». Écart entre deux horodatages : un formatage, pas un calcul métier.
 */
export function formatWhen(f: Formatters, createdAt: string, now: Date): string {
    const group = dayGroup(createdAt, now)
    const relative = new Intl.RelativeTimeFormat(f.locale, { numeric: "auto" })
    const minutes = Math.max(1, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60_000))
    if (group === "today")
        return minutes < 60 ? relative.format(-minutes, "minute") : relative.format(-Math.floor(minutes / 60), "hour")
    const time = f.formatDateWith({ hour: "2-digit", minute: "2-digit" })(createdAt)
    if (group === "yesterday") return `${relative.format(-1, "day")}, ${time}`
    return f.formatDateWith({ weekday: "short", day: "2-digit", month: "2-digit" })(createdAt)
}
