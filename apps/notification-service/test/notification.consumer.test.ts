import { expect, test } from "bun:test"
import NotificationConsumer from "../consumers/notification.consumer"

const context = { topic: "notification.requested" } as never

test("message invalide : ignoré sans exception", async () => {
    await new NotificationConsumer().handle({ nope: true }, context)
})
