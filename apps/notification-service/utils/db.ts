import { Logger } from "@azimut/utils";
import { prisma } from "../prisma";

const logger = Logger.here();

/** Contrôle `database` de `/readiness` : `true` si la base `notifications` répond à une lecture minimale. Ne lève jamais. */
export const isDbConnected = async (): Promise<boolean> => {
    try {
        await prisma.notification.findFirst({ select: { id: true } });
        return true;
    } catch (_error) {
        logger.error("Database connection failed");
        return false;
    }
};
