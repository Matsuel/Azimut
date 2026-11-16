"use client"

import { useTranslations } from "next-intl"
import type { ReactElement, ReactNode } from "react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface AppAlertDialogProps {
    trigger: ReactElement // élément qui ouvre la confirmation, rendu tel quel (bouton)
    title: ReactNode
    description?: ReactNode
    variant?: "default" | "destructive" // `destructive` : bouton de confirmation rouge (suppression, réinitialisation)
    confirmLabel?: ReactNode // défaut : « Confirmer »
    cancelLabel?: ReactNode // défaut : « Annuler »
    onConfirm: () => void
}

/** Confirmation d'une action : titre, description, boutons Annuler et Confirmer ; la boîte se ferme dans les deux cas. */
export function AppAlertDialog({
    trigger,
    title,
    description,
    variant = "default",
    confirmLabel,
    cancelLabel,
    onConfirm,
}: AppAlertDialogProps) {
    const t = useTranslations("components.alertDialog")
    return (
        <AlertDialog>
            <AlertDialogTrigger render={trigger} />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{cancelLabel ?? t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction variant={variant} onClick={onConfirm}>
                        {confirmLabel ?? t("confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
