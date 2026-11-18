// Variables exigées par env.ts et la config Kafka : valeurs factices, aucune connexion Kafka n'est ouverte par les tests
process.env.INTERNAL_API_KEY ??= "test-internal-key-0000"
process.env.KAFKA_BROKERS ??= "localhost:9094"
process.env.KAFKA_CLIENT_ID ??= "notification-service-test"

// Base jetable des tests de repository : TOUJOURS une base à part, jamais DATABASE_URL (celle du .env est la base de dev)
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://trading:trading@localhost:5432/notifications_test"
process.env.DATABASE_URL = TEST_DATABASE_URL

/**
 * Applique les migrations sur `notifications_test` (Prisma crée la base si elle n'existe pas). `process.env.TEST_DB_READY` vaut "1"
 * si la base est prête, sinon (PostgreSQL éteint) les tests de repository sont ignorés au lieu d'échouer.
 */
async function prepareTestDatabase() {
    const migrate = Bun.spawn(["bunx", "prisma", "migrate", "deploy"], {
        cwd: import.meta.dir + "/..",
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
        stdout: "ignore",
        stderr: "pipe",
    })
    process.env.TEST_DB_READY = (await migrate.exited) === 0 ? "1" : "0"
}

await prepareTestDatabase()
