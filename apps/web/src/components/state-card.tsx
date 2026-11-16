import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty"
import { cn } from "@/lib/utils"

/** Carte d'un état d'une page (cadre `33 · Risque · états`) : message centré et, s'il y en a, une action. */
export function StateCard({ message, action, error }: { message: string; action?: ReactNode; error?: boolean }) {
    return (
        <Card>
            <Empty className="h-40">
                <EmptyDescription className={cn(error && "text-destructive")}>{message}</EmptyDescription>
                {action && <EmptyContent>{action}</EmptyContent>}
            </Empty>
        </Card>
    )
}
