import type { Request, Response, NextFunction } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { Logger } from '@azimut/utils'
import { auth } from '../lib/auth'
import { UnauthorizedError } from "@azimut/http";

const logger = Logger.here()

/**
 * Lit la session better-auth et pose `userId` et `userRole` ; sans session → `UnauthorizedError` (401).
 * `fresh` relit la session en base au lieu du `cookieCache` (5 min), pour qu'un rôle retiré prenne effet tout de suite.
 */
const sessionMiddleware = (fresh: boolean) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
            query: fresh ? { disableCookieCache: true } : undefined,
        })

        if (!session?.user) return next(new UnauthorizedError())

        req.userId = session.user.id
        req.userRole = session.user.role
        next()
    } catch (error) {
        logger.error('Authentication error', { error: error instanceof Error ? error.message : String(error) })
        next(new UnauthorizedError())
    }
}

const authMiddleware = sessionMiddleware(false)

/** `authMiddleware` sans cache de session : à monter devant `requireAdmin` (un administrateur rétrogradé est refusé aussitôt). */
export const freshAuthMiddleware = sessionMiddleware(true)

export default authMiddleware