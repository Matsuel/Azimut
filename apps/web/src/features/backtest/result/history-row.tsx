import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Ligne d'un historique d'exécutions : tentative et badge d'état, détail dessous (`detail`, `detailClassName` pour le colorer), `children` sous le détail (barre de progression), `trailing` à droite.
 * `role="listitem"` : le conteneur porte `role="list"`.
 */
export function HistoryRow({
    attempt,
    badge,
    detail,
    detailClassName,
    trailing,
    children,
}: {
    attempt: number
    badge: ReactNode
    detail: ReactNode
    detailClassName?: string
    trailing: ReactNode
    children?: ReactNode
}) {
    return (
        <div role="listitem" className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
            <div className="flex w-full max-w-165 flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="text-body-medium">#{attempt}</span>
                    {badge}
                </div>
                <span className={cn("text-small text-muted-foreground", detailClassName)}>{detail}</span>
                {children}
            </div>
            <span className="shrink-0 text-small text-muted-foreground">{trailing}</span>
        </div>
    )
}
