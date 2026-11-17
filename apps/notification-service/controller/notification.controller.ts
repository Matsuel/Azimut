import type { Request, Response } from "express";
import { BadRequestError } from "@azimut/http";
import { API_ERROR_CODES } from "@azimut/contracts";
import { Logger } from "@azimut/utils";
import NotificationService from "../services/notification.service";
import { listNotificationsQuerySchema, notificationIdSchema } from "../interfaces/notification.interface";

const logger = Logger.here();

class NotificationController {

    private notificationService = new NotificationService();

    list = async (req: Request, res: Response) => {
        logger.info(`Handling list notifications request ${req.method} ${req.originalUrl}`)

        const parsed = listNotificationsQuerySchema.safeParse(req.query)
        if (!parsed.success) throw new BadRequestError(API_ERROR_CODES.INVALID_QUERY, { issues: parsed.error.issues })

        const { page, pageSize, ...filters } = parsed.data
        res.json(await this.notificationService.list(res.locals.userId, filters, { page, pageSize }))
    }

    unreadCount = async (_req: Request, res: Response) => {
        res.json({ count: await this.notificationService.countUnread(res.locals.userId) })
    }

    markRead = async (req: Request, res: Response) => {
        logger.info(`Handling mark notification read request ${req.method} ${req.originalUrl}`)

        const parsed = notificationIdSchema.safeParse(req.params.id)
        if (!parsed.success) throw new BadRequestError(API_ERROR_CODES.INVALID_QUERY, { issues: parsed.error.issues })

        await this.notificationService.markRead(parsed.data, res.locals.userId)
        res.status(204).end()
    }

    markAllRead = async (_req: Request, res: Response) => {
        await this.notificationService.markAllRead(res.locals.userId)
        res.status(204).end()
    }
}

export default NotificationController;
