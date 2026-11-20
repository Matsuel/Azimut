import {
    Activity,
    Bell,
    BrainCircuit,
    ChartCandlestick,
    Database,
    FileText,
    FlaskConical,
    GitCompareArrows,
    LayoutDashboard,
    Percent,
    ShieldAlert,
    Sparkles,
    TrendingUp,
    Users,
} from "lucide-react"
import type { Messages } from "next-intl"
import type { ReactNode } from "react"
import { UnreadBadge } from "@/features/notifications/unread-badge"
import { routes } from "@/lib/routes"

// `key` : clé du libellé dans les dictionnaires (`navigation.tabs.<key>`, `navigation.sections.<key>`)
// `badge` : pastille à droite du libellé (ex. compteur de non lues)
export type SidebarTab = { key: keyof Messages["navigation"]["tabs"]; url: string; icon: ReactNode; badge?: ReactNode }

export type SidebarSection = {
    key: keyof Messages["navigation"]["sections"]
    adminOnly: boolean
    tabs: SidebarTab[]
}

// Sections du menu (maquette Figma) : laboratoire, analyse, dérivés, trading virtuel, suivi, administration.
// Les onglets « Options » et « Structuration » de « Dérivés » et l'onglet « Alertes » arrivent avec leurs features.
export const sidebarSections: SidebarSection[] = [
    {
        key: "laboratory",
        adminOnly: false,
        tabs: [
            { key: "dashboard", url: routes.dashboard, icon: <LayoutDashboard /> },
            { key: "market", url: routes.market, icon: <ChartCandlestick /> },
            { key: "backtests", url: routes.backtests, icon: <FlaskConical /> },
        ],
    },
    {
        key: "analysis",
        adminOnly: false,
        tabs: [
            { key: "compare", url: routes.compare, icon: <GitCompareArrows /> },
            { key: "risk", url: routes.risk, icon: <ShieldAlert /> },
            { key: "projection", url: routes.projection, icon: <Sparkles /> },
            { key: "optimization", url: routes.optimization, icon: <BrainCircuit /> },
        ],
    },
    {
        key: "derivatives",
        adminOnly: false,
        tabs: [{ key: "rates", url: routes.rates, icon: <Percent /> }],
    },
    {
        key: "virtualTrading",
        adminOnly: false,
        tabs: [{ key: "paperTrading", url: routes.paperTrading, icon: <TrendingUp /> }],
    },
    {
        key: "followUp",
        adminOnly: false,
        tabs: [
            { key: "reports", url: routes.reports, icon: <FileText /> },
            { key: "notifications", url: routes.notifications, icon: <Bell />, badge: <UnreadBadge /> },
        ],
    },
    {
        key: "administration",
        adminOnly: true,
        tabs: [
            { key: "monitoring", url: routes.monitoring, icon: <Activity /> },
            { key: "users", url: routes.users, icon: <Users /> },
            { key: "referenceData", url: routes.referenceData, icon: <Database /> },
        ],
    },
]
