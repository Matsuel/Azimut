import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().min(1),
    NODE_ENV: z.string().optional(),
    // Partagée avec core-backend : seul son proxy peut appeler ce service
    INTERNAL_API_KEY: z.string().min(16),
    PORT: z.coerce.number().int().default(8002),
});

export const env = envSchema.parse(process.env);
