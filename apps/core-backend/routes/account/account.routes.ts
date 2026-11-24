import AccountController from "../../controller/account.controller";
import authMiddleware from "../../middleware/auth.middleware";
import type { RouteDescriptor } from "@azimut/http";
import asyncHandler from "../../utils/handler";

const createAccountRoutes = (): RouteDescriptor[] => {
    const controller = new AccountController();

    const prefix = "/api/account";

    return [
        {
            method: "post",
            path: `${prefix}/reset`,
            middlewares: [authMiddleware],
            handler: asyncHandler(controller.resetAccount)
        }
    ]
}

export default createAccountRoutes
