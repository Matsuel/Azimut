"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ResetDataDialog } from "./reset-data-dialog"
import { SettingsCard } from "./settings-card"

/** Carte « Données » du profil (maquette `06`) : « Réinitialiser » ouvre le dialog de confirmation `06.3`. */
export function ResetDataCard() {
    const t = useTranslations("settings.reset")

    return (
        <SettingsCard title={t("title")} description={t("description")}>
            <div className="flex items-center justify-between gap-4">
                <div className="grid gap-0.5">
                    <p className="text-body-medium text-destructive">{t("action")}</p>
                    <p className="text-small text-muted-foreground">{t("warning")}</p>
                </div>
                <ResetDataDialog trigger={<Button variant="destructive">{t("button")}</Button>} />
            </div>
        </SettingsCard>
    )
}
