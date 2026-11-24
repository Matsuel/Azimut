# Catalogue web : `features/settings`

Écran Paramètres (maquettes `06`, `06.2`). Profil via better-auth (`updateUser`, pas de route ajoutée) ; préférences d'affichage sans route API ni base. Gabarits d'entrée et catalogue des composants partagés : [`COMPONENTS.md`](../../../COMPONENTS.md#gabarits). Toute création, modification ou suppression d'un export catalogué met à jour son entrée dans le même diff que le code.


### SettingsTabs

- **Import** : `import { SettingsTabs } from "@/features/settings/settings-tabs"`.
- **Rôle** : barre d'onglets des paramètres (`ui/tabs`) : Profil (défaut, `ProfileCard`), Portefeuille (`TabsTrigger` `disabled`, sans contenu : paper trading à venir), Apparence (`ThemeCard` puis `LanguageCard`). Un nouvel onglet = un `TabsTrigger` et son `TabsContent` ici.
- **Props** : `user` (`{ name, email }`, identité de la session lue par la page).
- **Exemple** (tiré de `src/app/app/settings/page.tsx`) :
  ```tsx
  <SettingsTabs user={user} />
  ```
- **Source** : `src/features/settings/settings-tabs.tsx`.

### SettingsCard

- **Import** : `import { SettingsCard } from "@/features/settings/settings-card"`.
- **Rôle** : carte d'un réglage (maquette `06.2`) : titre, description, puis le contrôle en `children` ; marges de 24 px, bordure et ombre légère (`Card` `compact` ajusté). Cadre commun à `ThemeCard` et `LanguageCard`.
- **Props** : `title` (string), `description` (string), `children` (`ReactNode`), tous requis.
- **Source** : `src/features/settings/settings-card.tsx`.

### ThemeCard

- **Import** : `import { ThemeCard } from "@/features/settings/theme-card"`.
- **Rôle** : carte « Thème » : trois aperçus Clair, Sombre, Système (`Button` variant `tile`), sur une colonne puis trois à partir de `sm`. Le clic applique le thème via next-themes, sans rechargement ; l'aperçu du thème actif est encadré (aucun avant l'hydratation, le thème venant du navigateur). Aperçus en couleurs fixes : ils montrent le thème représenté, pas le thème actif.
- **Props** : aucune.
- **Source** : `src/features/settings/theme-card.tsx`.

### LanguageCard

- **Import** : `import { LanguageCard } from "@/features/settings/language-card"`.
- **Rôle** : carte « Langue et région » : `OptionSelect` des langues de `i18n/config.ts` (nom de chaque langue dans sa propre langue). Le choix appelle `setLocale` : cookie `locale` écrit, page rendue dans la nouvelle langue sans perdre la session.
- **Props** : aucune.
- **Source** : `src/features/settings/language-card.tsx`.

### ProfileCard

- **Import** : `import { ProfileCard } from "@/features/settings/profile-card"`.
- **Rôle** : carte « Profil » (maquette `06`) : avatar à initiales, nom modifiable (1 à 100 caractères, schéma `createProfileSchema`) et e-mail en lecture seule avec sa note. « Enregistrer » est désactivé sans changement ; succès : `updateUser` puis session relue sans cache de cookie, toast, `router.refresh()` (la sidebar change aussitôt) ; erreur serveur affichée, saisie conservée.
- **Props** : `user` (`{ name, email }`), requis.
- **Source** : `src/features/settings/profile-card.tsx`.

### Fichiers de la feature

- `api.ts` : `updateProfile(values)` (better-auth, relance `AuthError`).
- `hook.ts` : `useUpdateProfile()`.
- `schema.ts` : `createProfileSchema(t)`, type `ProfileValues`.
- `constants.ts` : `NAME_MAX_LENGTH` (100).
- `utils.ts` : `initials(name)`.
