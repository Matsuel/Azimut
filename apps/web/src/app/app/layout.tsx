import { hasAdminRole } from "@azimut/utils/roles"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { NotificationToaster } from "@/features/notifications/toaster"
import { requireSession } from "@/lib/session"

// Pages connectées : session exigée côté serveur, sidebar selon le rôle ; SidebarInset rend le <main>
export default async function AppLayout({ children }: LayoutProps<"/app">) {
    const session = await requireSession()

    return (
        <SidebarProvider>
            <AppSidebar user={session.user} isAdmin={hasAdminRole(session.user.role)} />
            {/* min-w-0 : une table large défile dans sa carte au lieu d'élargir la page (tablette, sidebar ouverte) */}
            <SidebarInset className="min-w-0">
                <AppHeader />
                {children}
            </SidebarInset>
            <NotificationToaster />
        </SidebarProvider>
    )
}
