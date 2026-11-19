"use client"

import { XCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSeconds } from "@/features/backtest/utils"
import { MONITORED_SERVICE_COUNT, MONITORING_REFRESH_MS } from "./constants"
import { useMonitoringServices } from "./hook"
import { ServiceCard } from "./service-card"
import { MonitoringStats } from "./stats"
import type { MonitoringServicesResponse } from "./types"

const skeletons = (count: number, className: string) =>
    Array.from({ length: count }, (_, i) => <Skeleton key={i} className={className} />)

function ServicesHeader({ interval, down }: { interval: string; down?: number }) {
    const t = useTranslations("monitoring.services")

    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-body-semibold">{t("title")}</h2>
                <p className="text-small text-muted-foreground">{t("subtitle", { interval })}</p>
            </div>
            {!!down && <Badge variant="destructive">{t("downBadge", { count: down })}</Badge>}
        </div>
    )
}

function ServiceGrid({ data }: { data: MonitoringServicesResponse | undefined }) {
    // Instant de référence de « Vérifié il y a … », le même pour toutes les cartes d'un rendu
    const now = new Date()

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data
                ? data.services.map((status) => <ServiceCard key={status.service} status={status} now={now} />)
                : skeletons(MONITORED_SERVICE_COUNT, "h-45 rounded-xl")}
        </div>
    )
}

/**
 * Écran Monitoring (maquettes F16 : `09 · Monitoring · à modifier` node `606:14644`, chargement `614:14710`, erreur
 * `614:15017`) : synthèse et une carte par service, telles que calculées par core-backend
 * (`GET /api/admin/monitoring/services`), relues toutes les `MONITORING_REFRESH_MS`. Erreur : alerte et « Réessayer ».
 */
export function MonitoringOverview() {
    const t = useTranslations("monitoring")
    const tb = useTranslations("backtest")
    const tc = useTranslations("common")
    const query = useMonitoringServices()
    const interval = formatSeconds(tb, MONITORING_REFRESH_MS / 1000)

    if (query.isError) {
        return (
            <div className="flex flex-col items-start gap-4">
                <Alert variant="destructive">
                    <XCircle />
                    <AlertTitle>{t("error.title")}</AlertTitle>
                    <AlertDescription>{t("error.description", { interval })}</AlertDescription>
                </Alert>
                <Button variant="outline" onClick={() => query.refetch()}>
                    {tc("retry")}
                </Button>
            </div>
        )
    }

    const data = query.data
    return (
        <>
            {data ? (
                <MonitoringStats summary={data.summary} interval={interval} />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{skeletons(4, "h-33 rounded-xl")}</div>
            )}
            <section className="flex flex-col gap-4">
                <ServicesHeader interval={interval} down={data?.summary.down} />
                <ServiceGrid data={data} />
            </section>
        </>
    )
}
