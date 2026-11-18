import type { NotificationView } from "@azimut/contracts"

type Listener = (notification: NotificationView) => void

/** Abonnés SSE en mémoire, par utilisateur : plusieurs onglets d'un même utilisateur reçoivent tous la notification. */
class NotificationStreamService {
    private readonly listeners = new Map<string, Set<Listener>>()

    /** Abonne `listener` aux notifications de `userId` ; renvoie la fonction de désabonnement (à appeler à la fermeture du client). */
    subscribe(userId: string, listener: Listener): () => void {
        const set = this.listeners.get(userId) ?? new Set<Listener>()
        set.add(listener)
        this.listeners.set(userId, set)

        return () => {
            set.delete(listener)
            if (set.size === 0) this.listeners.delete(userId)
        }
    }

    /** Pousse la notification aux seuls abonnés de son propriétaire. */
    publish(userId: string, notification: NotificationView): void {
        this.listeners.get(userId)?.forEach((listener) => listener(notification))
    }
}

// Un seul registre par process : le service (publication) et le controller (abonnement) le partagent
export const notificationStream = new NotificationStreamService()

export default NotificationStreamService
