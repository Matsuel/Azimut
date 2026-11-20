import MonitoringController from "../../controller/monitoring.controller";
import { freshAuthMiddleware } from "../../middleware/auth.middleware";
import requireAdmin from "../../middleware/admin.middleware";
import type { RouteDescriptor } from "@azimut/http";
import asyncHandler from "../../utils/handler";

const createMonitoringRoutes = (): RouteDescriptor[] => {
    const controller = new MonitoringController();

    const prefix = "/api/admin/monitoring";

    return [
        {
            method: "get",
            path: `${prefix}/services`,
            // Session relue sans cache : un administrateur rétrogradé est refusé aussitôt
            middlewares: [freshAuthMiddleware, requireAdmin],
            handler: asyncHandler(controller.getServices)
        }
    ]
}

export default createMonitoringRoutes
