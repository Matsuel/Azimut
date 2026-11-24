"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useId } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"
import { FieldRow, TextField } from "@/components/form"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuthErrorMessage } from "@/features/auth/hook"
import { useUpdateProfile } from "./hook"
import { createProfileSchema, type ProfileValues } from "./schema"
import { SettingsCard } from "./settings-card"
import { initials } from "./utils"

interface ProfileCardProps {
    user: { name: string; email: string }
}

/**
 * Carte « Profil » (maquette `06`) : avatar à initiales, nom modifiable et e-mail en lecture seule. « Enregistrer »
 * reste désactivé tant que le nom n'a pas changé ; après succès la page est relue pour que la sidebar affiche le nom.
 * Une erreur serveur s'affiche sous les champs, la saisie est conservée.
 */
export function ProfileCard({ user }: ProfileCardProps) {
    const t = useTranslations("settings.profile")
    const emailId = useId()
    const router = useRouter()
    const authErrorMessage = useAuthErrorMessage()
    const { mutate, error, isPending } = useUpdateProfile()
    const form = useForm<ProfileValues>({
        resolver: zodResolver(createProfileSchema(useTranslations("settings.profile.validation"))),
        defaultValues: { name: user.name },
    })

    const onSubmit = (values: ProfileValues) =>
        mutate(values, {
            onSuccess: () => {
                form.reset(values)
                toast.success(t("saved"))
                router.refresh() // relit la session côté serveur : `nav-user` change aussitôt
            },
        })

    return (
        <SettingsCard title={t("title")} description={t("description")}>
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
                    <Avatar size="lg">
                        <AvatarFallback>{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <FieldRow>
                        <TextField name="name" label={t("name")} />
                        <Field>
                            <FieldLabel htmlFor={emailId}>{t("email")}</FieldLabel>
                            <Input id={emailId} type="email" value={user.email} disabled readOnly />
                            <FieldDescription>{t("emailNote")}</FieldDescription>
                        </Field>
                    </FieldRow>
                    {error && <FieldError>{authErrorMessage(error, t("failed"))}</FieldError>}
                    <Button type="submit" className="justify-self-end" disabled={!form.formState.isDirty || isPending}>
                        {t("save")}
                    </Button>
                </form>
            </FormProvider>
        </SettingsCard>
    )
}
