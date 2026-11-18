"use client"

import { SidebarMenuBadge } from "@/components/ui/sidebar"
import { useUnreadCount } from "./hook"

/** Compteur de non lues du menu « Notifications » (valeur de l'API) ; masqué à 0 et tant qu'il n'est pas chargé. */
export function UnreadBadge() {
    const { data } = useUnreadCount()
    if (!data?.count) return null
    return (
        <SidebarMenuBadge className="bg-primary text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-active/menu-button:text-primary-foreground">
            {data.count}
        </SidebarMenuBadge>
    )
}
