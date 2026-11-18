import type { Request, Response } from "express";
import { BadRequestError } from "@azimut/http";
import { API_ERROR_CODES } from "@azimut/contracts";
import { Logger } from "@azimut/utils";
import NotificationService from "../services/notification.service";
import { notificationStream } from "../services/notification-stream.service";
import { NOTIFICATION_HEARTBEAT_MS } from "../constants/notification.constants";
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

    /** Flux SSE : reste ouvert, un événement `notification` par nouvelle notification de l'utilisateur, un commentaire de battement toutes les 25 s. */
    stream = (req: Request, res: Response) => {
        res.set({
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            // Interdit à un reverse proxy (nginx) de mettre le flux en mémoire tampon
            "X-Accel-Buffering": "no",
        })
        res.flushHeaders()
        res.write(": connected\n\n")

        const unsubscribe = notificationStream.subscribe(res.locals.userId, (notification) => {
            res.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`)
        })
        const heartbeat = setInterval(() => res.write(": ping\n\n"), NOTIFICATION_HEARTBEAT_MS)

        req.on("close", () => {
            clearInterval(heartbeat)
            unsubscribe()
        })
    }
}

export default NotificationController;
