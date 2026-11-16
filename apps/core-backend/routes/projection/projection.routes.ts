import ProjectionController from "../../controller/projection.controller";
import authMiddleware from "../../middleware/auth.middleware";
import type { RouteDescriptor } from "@azimut/http";
import asyncHandler from "../../utils/handler";

const createProjectionRoutes = (): RouteDescriptor[] => {
    const controller = new ProjectionController();

    const prefix = "/api/projection";

    return [
        {
            method: "get",
            path: `${prefix}/:backtestId`,
            middlewares: [authMiddleware],
            handler: asyncHandler(controller.getProjection)
        }
    ]
}

export default createProjectionRoutes
