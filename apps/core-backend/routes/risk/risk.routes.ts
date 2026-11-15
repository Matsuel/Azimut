import RiskController from "../../controller/risk.controller";
import authMiddleware from "../../middleware/auth.middleware";
import type { RouteDescriptor } from "@azimut/http";
import asyncHandler from "../../utils/handler";

const createRiskRoutes = (): RouteDescriptor[] => {
    const controller = new RiskController();

    const prefix = "/api/risk";

    return [
        {
            method: "get",
            path: `${prefix}/:backtestId`,
            middlewares: [authMiddleware],
            handler: asyncHandler(controller.getRisk)
        },
        {
            method: "put",
            path: `${prefix}/:backtestId/constraint`,
            middlewares: [authMiddleware],
            handler: asyncHandler(controller.setConstraint)
        }
    ]
}

export default createRiskRoutes
