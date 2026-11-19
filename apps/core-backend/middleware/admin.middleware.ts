import type { Request, Response, NextFunction } from 'express'
import { ForbiddenError, UnauthorizedError } from "@azimut/http";
import { hasAdminRole } from "@azimut/utils";

/**
 * Réserve la route aux administrateurs. Se monte après `authMiddleware`, seul lecteur de la session, qui pose `userId` et `userRole` :
 * sans `userId` → `UnauthorizedError` (401), rôle sans `admin` → `ForbiddenError` (403).
 */
const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userId) return next(new UnauthorizedError())

    if (!hasAdminRole(req.userRole)) return next(new ForbiddenError())

    next()
}

export default requireAdmin
