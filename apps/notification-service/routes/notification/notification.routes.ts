import NotificationController from "../../controller/notification.controller";
import type { RouteDescriptor } from "@azimut/http";
import asyncHandler from "../../utils/handler";

const createNotificationRoutes = (): RouteDescriptor[] => {

    const controller = new NotificationController();

    const prefix = "/api/notifications";

    return [
        {
            method: "get",
            path: prefix,
            handler: asyncHandler(controller.list)
        },
        {
            method: "get",
            path: `${prefix}/unread-count`,
            handler: asyncHandler(controller.unreadCount)
        },
        {
            method: "get",
            path: `${prefix}/stream`,
            handler: controller.stream
        },
        {
            method: "post",
            path: `${prefix}/read-all`,
            handler: asyncHandler(controller.markAllRead)
        },
        {
            method: "post",
            path: `${prefix}/:id/read`,
            handler: asyncHandler(controller.markRead)
        },
    ];
};

export default createNotificationRoutes;
