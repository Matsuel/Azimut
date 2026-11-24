"use client"

import { AlertTriangle } from "lucide-react"
import { useTranslations } from "next-intl"
import { type ReactElement, useState } from "react"
import { toast } from "sonner"
import { AppDialog } from "@/components/app-dialog"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useApiErrorMessages } from "@/lib/api-error"
import { useResetAccountData } from "./hook"

const DELETED_FAMILIES = ["backtests", "portfolios", "pricing", "notifications"] as const

// Titre du dialog avec la pastille d'avertissement (maquette 06.3)
function ResetTitle() {
    const t = useTranslations("settings.reset.dialog")
    return (
        <span className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
            </span>
            {t("title")}
        </span>
    )
}

// Récapitulatif des familles supprimées, sans compteur (D8)
function DeletedFamilies() {
    const t = useTranslations("settings.reset.dialog")
    return (
        <ul className="grid gap-2 rounded-lg bg-muted p-4 text-body">
            {DELETED_FAMILIES.map((family) => (
                <li key={family} className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">{t(`families.${family}`)}</span>
                    <span className="text-body-semibold">{t("deleted")}</span>
                </li>
            ))}
        </ul>
    )
}

/**
 * Dialog de confirmation « Réinitialiser mes données » (maquette `06.3`) : récapitulatif des familles supprimées,
 * puis saisie du mot de confirmation. Le bouton rouge reste désactivé tant que la saisie n'est pas exactement ce mot.
 * Succès : toute donnée en cache est invalidée, la boîte se ferme, un toast confirme. Échec : message, boîte ouverte.
 * `trigger` : bouton qui ouvre la boîte.
 */
export function ResetDataDialog({ trigger }: { trigger: ReactElement }) {
    const t = useTranslations("settings.reset.dialog")
    const { errorMessage } = useApiErrorMessages()
    const [open, setOpen] = useState(false)
    const [typed, setTyped] = useState("")
    const { mutate, isPending, error, reset } = useResetAccountData()
    const word = t("confirmWord")

    const onOpenChange = (next: boolean) => {
        setOpen(next)
        if (!next) {
            setTyped("")
            reset()
        }
    }
    const confirm = () =>
        mutate(undefined, {
            onSuccess: () => {
                onOpenChange(false)
                toast.success(t("done"))
            },
        })

    return (
        <AppDialog
            trigger={trigger}
            open={open}
            onOpenChange={onOpenChange}
            title={<ResetTitle />}
            description={t("description")}
        >
            <DeletedFamilies />
            <div className="grid gap-2">
                <FieldLabel htmlFor="reset-data-confirmation">{t("prompt", { word })}</FieldLabel>
                <Input
                    id="reset-data-confirmation"
                    value={typed}
                    placeholder={word}
                    autoComplete="off"
                    onChange={(event) => setTyped(event.target.value)}
                />
            </div>
            {error && <FieldError>{errorMessage(error)}</FieldError>}
            <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    {t("cancel")}
                </Button>
                <Button variant="destructive" disabled={typed !== word || isPending} onClick={confirm}>
                    {t("confirm")}
                </Button>
            </DialogFooter>
        </AppDialog>
    )
}
