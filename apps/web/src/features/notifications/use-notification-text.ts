import { useTranslations } from "next-intl"
import { useFormatters } from "@/lib/format"
import type { NotificationView } from "./types"

/**
 * Rend le titre et la ligne de détail d'une notification dans la langue active, à partir de son type et de ses
 * paramètres (le backend ne stocke aucun texte). Ratios formatés ; le drawdown s'affiche négatif (−21,4 %).
 */
export function useNotificationText() {
    const t = useTranslations("notifications")
    const tBacktest = useTranslations("backtest")
    const f = useFormatters()

    return (n: NotificationView): { title: string; detail: string } => {
        const title = t(`types.${n.type}.title`)
        switch (n.type) {
            case "BACKTEST_COMPLETED":
                return {
                    title,
                    detail: t("types.BACKTEST_COMPLETED.detail", {
                        name: n.params.name,
                        cagr: n.params.cagr === null ? "—" : f.formatPercent1(n.params.cagr),
                        sharpe: n.params.sharpe === null ? "—" : f.formatSharpe(n.params.sharpe),
                        drawdown: f.formatPercent1(-n.params.maxDrawdown),
                    }),
                }
            case "BACKTEST_FAILED":
                return {
                    title,
                    detail: t("types.BACKTEST_FAILED.detail", {
                        name: n.params.name,
                        reason: tBacktest(`executionErrors.${n.params.errorCode ?? "ENGINE_FAILED"}`),
                    }),
                }
            case "RISK_CONSTRAINT_VIOLATED":
                return {
                    title,
                    detail: t("types.RISK_CONSTRAINT_VIOLATED.detail", {
                        name: n.params.name,
                        drawdown: f.formatPercent1(-n.params.maxDrawdown),
                        limit: f.formatRate(n.params.limit),
                    }),
                }
            case "PROJECTION_COMPLETED":
                return {
                    title,
                    detail: t("types.PROJECTION_COMPLETED.detail", {
                        name: n.params.name,
                        scenarios: f.formatDecimal1(n.params.scenarios),
                        lossProbability: f.formatRate(n.params.lossProbability),
                    }),
                }
        }
    }
}
