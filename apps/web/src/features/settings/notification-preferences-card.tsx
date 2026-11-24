"use client"

import { useTranslations } from "next-intl"
import { Fragment } from "react"
import { toast } from "sonner"
import { ErrorState } from "@/components/query-status"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { PREFERENCE_CATEGORIES } from "./constants"
import { useNotificationPreferences, useUpdateNotificationPreferences } from "./hook"
import { SettingsCard } from "./settings-card"
import type { NotificationCategory } from "./types"

function PreferenceRowSkeleton() {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="grid gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
        </div>
    )
}

interface PreferenceRowProps {
    category: NotificationCategory
    checked: boolean
    onChange: (checked: boolean) => void
}

function PreferenceRow({ category, checked, onChange }: PreferenceRowProps) {
    const t = useTranslations("settings.notifications.categories")
    const id = `notification-preference-${category}`

    return (
        <div className="flex items-center justify-between gap-4">
            <div className="grid gap-0.5">
                <Label htmlFor={id}>{t(`${category}.label`)}</Label>
                <p className="text-small text-muted-foreground">{t(`${category}.description`)}</p>
            </div>
            <Switch id={id} checked={checked} onCheckedChange={onChange} />
        </div>
    )
}

/**
 * Carte « Notifications » (maquette `06.1`) : un interrupteur par catégorie (Backtests, Risque). Un clic bascule
 * aussitôt ; si l'API échoue l'interrupteur revient et un toast l'indique.
 */
export function NotificationPreferencesCard() {
    const t = useTranslations("settings.notifications")
    const query = useNotificationPreferences()
    const { mutate } = useUpdateNotificationPreferences({ onError: () => toast.error(t("saveFailed")) })

    return (
        <SettingsCard title={t("title")} description={t("description")}>
            {query.isError ? (
                <ErrorState message={t("loadFailed")} onRetry={query.refetch} />
            ) : (
                <div className="grid gap-4">
                    {PREFERENCE_CATEGORIES.map((category, index) => (
                        <Fragment key={category}>
                            {index > 0 && <Separator />}
                            {query.data ? (
                                <PreferenceRow
                                    category={category}
                                    checked={query.data[category]}
                                    onChange={(checked) => mutate({ [category]: checked })}
                                />
                            ) : (
                                <PreferenceRowSkeleton />
                            )}
                        </Fragment>
                    ))}
                </div>
            )}
        </SettingsCard>
    )
}
