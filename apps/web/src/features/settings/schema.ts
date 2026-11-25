import type { useTranslations } from "next-intl"
import { z } from "zod"
import { NAME_MAX_LENGTH } from "./constants"

type ProfileTranslator = ReturnType<typeof useTranslations<"settings.profile.validation">>

/** Schéma du formulaire de profil : nom de 1 à `NAME_MAX_LENGTH` caractères, messages dans la langue de `t`. */
export function createProfileSchema(t: ProfileTranslator) {
    return z.object({
        name: z
            .string()
            .trim()
            .min(1, t("nameRequired"))
            .max(NAME_MAX_LENGTH, t("nameMaxLength", { count: NAME_MAX_LENGTH })),
    })
}

export type ProfileValues = z.infer<ReturnType<typeof createProfileSchema>>
