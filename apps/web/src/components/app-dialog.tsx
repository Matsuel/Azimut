import type { ReactElement, ReactNode } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface AppDialogProps {
    trigger: ReactElement // élément qui ouvre la boîte, rendu tel quel (bouton, libellé)
    title: ReactNode
    description?: ReactNode
    children?: ReactNode
    className?: string
    open?: boolean // contrôlé avec `onOpenChange` ; absent, la boîte gère son état
    onOpenChange?: (open: boolean) => void
}

/** Boîte de dialogue centrée avec titre et description, ouverte par `trigger`. */
export function AppDialog({ trigger, title, description, children, className, open, onOpenChange }: AppDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent className={className}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    )
}
