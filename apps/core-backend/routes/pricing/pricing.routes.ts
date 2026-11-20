import PricingController from "../../controller/pricing.controller";
import authMiddleware from "../../middleware/auth.middleware";
import type { RouteDescriptor } from "@azimut/http";
import asyncHandler from "../../utils/handler";

const createPricingRoutes = (): RouteDescriptor[] => {
    const controller = new PricingController();

    const prefix = "/api/pricing";

    return [
        {
            method: "post",
            path: prefix,
            middlewares: [authMiddleware],
            handler: asyncHandler(controller.createPricing)
        },
        {
            method: "get",
            path: `${prefix}/:id`,
            middlewares: [authMiddleware],
            handler: asyncHandler(controller.getPricing)
        }
    ]
}

export default createPricingRoutes
