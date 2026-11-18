// Ports et secrets de la stack E2E : distincts de ceux du dev (3000, 8000-8002, 5432, 9094) pour tourner à côté de lui.
// Valeurs factices, propres aux tests : la base et Kafka sont jetables (docker-compose.yml de ce dossier).

/** Environnement du process parent (PATH, HOME) transmis aux services lancés par `stack.ts`. */
export const parentEnv = process.env

/** Vrai en CI GitHub : un seul essai de plus, rapport conservé (`playwright.config.ts`). */
export const isCI = Boolean(process.env.CI)

export const PORTS = {
    web: 3100,
    core: 8100,
    market: 8101,
    notification: 8102,
    postgres: 15432,
    kafka: 19094,
} as const

export const URLS = {
    web: `http://localhost:${PORTS.web}`,
    core: `http://localhost:${PORTS.core}`,
    // Base des routes de core-backend vue du navigateur (`NEXT_PUBLIC_API_URL`)
    api: `http://localhost:${PORTS.core}/api`,
    market: `http://localhost:${PORTS.market}`,
    notification: `http://localhost:${PORTS.notification}`,
} as const

export const INTERNAL_API_KEY = "e2e-internal-key-0123456789"
export const BETTER_AUTH_SECRET = "e2e-better-auth-secret-0123456789abcdef"
export const KAFKA_BROKERS = `localhost:${PORTS.kafka}`

/** URL PostgreSQL d'une base de la stack E2E (`trading_e2e`, `notifications_e2e`), créée par `prisma migrate deploy`. */
export const databaseUrl = (database: string) => `postgresql://trading:trading@localhost:${PORTS.postgres}/${database}`
