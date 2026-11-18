import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { INTERNAL_KEY_HEADER } from "@azimut/contracts";
import { UnauthorizedError } from "@azimut/http";
import { env } from "../env";

const expected = Buffer.from(env.INTERNAL_API_KEY);

/**
 * Refuse (`401`) tout appel sans la clé interne de core-backend (comparaison à temps constant) ou sans `x-user-id`.
 * Place l'utilisateur authentifié par core-backend dans `res.locals.userId`.
 */
const internalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const received = Buffer.from(req.header(INTERNAL_KEY_HEADER) ?? "");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return next(new UnauthorizedError());

    const userId = req.header("x-user-id");
    if (!userId) return next(new UnauthorizedError());

    res.locals.userId = userId;
    next();
};

export default internalAuthMiddleware;
