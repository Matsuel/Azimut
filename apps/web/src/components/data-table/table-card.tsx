import type { ReactNode } from "react"

interface TableCardProps {
    title?: ReactNode
    description?: ReactNode
    actions?: ReactNode // ex. onglets de filtre, à droite du titre
    children: ReactNode // le `DataTable`
}

/** Cadre d'un tableau : bordure, marges et, s'il y en a, titre, description et actions au-dessus. */
export function TableCard({ title, description, actions, children }: TableCardProps) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border p-6">
            {(title || description || actions) && (
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 max-w-full flex-col">
                        {title && <span className="text-body-semibold">{title}</span>}
                        {description && <span className="text-small text-muted-foreground">{description}</span>}
                    </div>
                    {actions}
                </div>
            )}
            {children}
        </div>
    )
}
