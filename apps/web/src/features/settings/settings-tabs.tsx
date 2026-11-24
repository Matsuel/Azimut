import { useTranslations } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LanguageCard } from "./language-card"
import { ProfileCard } from "./profile-card"
import { ThemeCard } from "./theme-card"

interface SettingsTabsProps {
    user: { name: string; email: string }
}

/**
 * Onglets des paramètres : Profil (défaut), Portefeuille (désactivé : le paper trading n'existe pas encore, il n'a
 * pas de contenu) et Apparence. `user` : identité de la session, pour la carte de profil.
 */
export function SettingsTabs({ user }: SettingsTabsProps) {
    const t = useTranslations("settings.tabs")

    return (
        <Tabs defaultValue="profile" className="gap-6">
            <TabsList>
                <TabsTrigger value="profile">{t("profile")}</TabsTrigger>
                <TabsTrigger value="wallet" disabled>
                    {t("wallet")}
                </TabsTrigger>
                <TabsTrigger value="appearance">{t("appearance")}</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="flex flex-col gap-6">
                <ProfileCard user={user} />
            </TabsContent>
            <TabsContent value="appearance" className="flex flex-col gap-6">
                <ThemeCard />
                <LanguageCard />
            </TabsContent>
        </Tabs>
    )
}
