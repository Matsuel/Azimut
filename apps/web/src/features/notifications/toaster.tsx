"use client"

import { Toaster } from "@/components/ui/sonner"
import { MAX_TOASTS } from "./constants"
import { useNotificationStream } from "./stream"

/** Toaster `22.1` : ouvre le flux de notifications et affiche, en bas à droite, au plus `MAX_TOASTS` notifications reçues. */
export function NotificationToaster() {
    useNotificationStream()
    return <Toaster position="bottom-right" visibleToasts={MAX_TOASTS} closeButton />
}
