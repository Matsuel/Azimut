import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getNotificationPreferences, updateNotificationPreferences, updateProfile } from "./api"
import type { NotificationPreferences } from "./types"

export function useUpdateProfile() {
    return useMutation({ mutationFn: updateProfile })
}

export const notificationPreferencesKey = ["settings", "notification-preferences"] as const

export function useNotificationPreferences() {
    return useQuery({ queryKey: notificationPreferencesKey, queryFn: getNotificationPreferences })
}

/**
 * Met à jour une ou plusieurs catégories : l'interrupteur bascule aussitôt (cache modifié), revient en arrière si
 * l'API échoue (`onError` reçoit l'erreur), puis la valeur du serveur remplace le cache.
 */
export function useUpdateNotificationPreferences(options: { onError?: () => void } = {}) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: updateNotificationPreferences,
        onMutate: async (update) => {
            await queryClient.cancelQueries({ queryKey: notificationPreferencesKey })
            const previous = queryClient.getQueryData<NotificationPreferences>(notificationPreferencesKey)
            if (previous) queryClient.setQueryData(notificationPreferencesKey, { ...previous, ...update })
            return { previous }
        },
        onError: (_error, _update, context) => {
            if (context?.previous) queryClient.setQueryData(notificationPreferencesKey, context.previous)
            options.onError?.()
        },
        onSuccess: (saved) => queryClient.setQueryData(notificationPreferencesKey, saved),
    })
}
