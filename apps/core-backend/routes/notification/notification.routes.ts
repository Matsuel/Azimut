import authMiddleware from "../../middleware/auth.middleware";
import type { RouteDescriptor } from "@azimut/http";
import proxyTo from "../../utils/proxy";
import { env } from "../../env";

const createNotificationRoutes = (): RouteDescriptor[] => {

    const prefix = "/api/notifications";
    const relay = proxyTo(env.NOTIFICATION_SERVICE_URL);
    // Flux SSE : la réponse ne se termine pas, le délai de 10 s des autres routes le couperait
    const relayStream = proxyTo(env.NOTIFICATION_SERVICE_URL, { stream: true });

    // Liste blanche des routes de la feature 15 (D9) et des préférences ; le service lit l'utilisateur dans `x-user-id`
    const route = (method: RouteDescriptor["method"], path: string, handler = relay): RouteDescriptor => ({
        method,
        path: `${prefix}${path}`,
        middlewares: [authMiddleware],
        handler,
    });

    return [
        route("get", ""),
        route("get", "/unread-count"),
        route("get", "/stream", relayStream),
        route("post", "/read-all"),
        route("get", "/preferences"),
        route("put", "/preferences"),
        route("post", "/:id/read"),
    ];
}

export default createNotificationRoutes;
