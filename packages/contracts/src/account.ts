import { z } from "zod";
import { kafkaEventSchema } from "./event";

export const ACCOUNT_TOPICS = {
    // Publié par core-backend après la suppression des données `trading` d'un utilisateur ; consommé par notification-service
    dataReset: "user.data.reset",
} as const;

export const userDataResetPayloadSchema = z.object({
    // Identifiant de l'utilisateur dont les données viennent d'être effacées
    userId: z.string().min(1),
});

export const userDataResetEventSchema = kafkaEventSchema(userDataResetPayloadSchema);

export type UserDataResetPayload = z.infer<typeof userDataResetPayloadSchema>;
