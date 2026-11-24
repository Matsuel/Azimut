import { describe } from "bun:test"
import { prisma } from "../prisma"

/** `describe` des tests de repository : ignoré si la base de test n'a pas pu être préparée (voir `setup.ts`). */
export const describeWithDb = describe.skipIf(process.env.TEST_DB_READY !== "1")

/** Vide la base de test. */
export async function resetDatabase() {
    await prisma.notification.deleteMany()
    await prisma.notificationPreference.deleteMany()
}
