// Lance la stack E2E, exécute Playwright, puis arrête tout, même en échec :
//   bun run e2e [--skip-build] [arguments de playwright test]
// 1. PostgreSQL et Kafka jetables (docker-compose.yml de ce dossier) ; 2. migrations des bases trading_e2e et
// notifications_e2e ; 3. build du web ; 4. services (faux market-service, core-backend, notification-service, engines,
// web) avec un environnement complet, qui masque les `.env` de dev ; 5. attente que chaque consumer Kafka ait rejoint son
// groupe (un événement publié avant serait perdu : les groupes lisent depuis le dernier offset) ; 6. `playwright test`.
import { mkdirSync, openSync } from "node:fs"
import { join } from "node:path"
import { BETTER_AUTH_SECRET, databaseUrl, INTERNAL_API_KEY, KAFKA_BROKERS, PORTS, parentEnv, URLS } from "./env"

const web = join(import.meta.dir, "..")
const apps = join(web, "..")
const compose = ["docker", "compose", "-f", join(import.meta.dir, "docker-compose.yml")]
const logs = join(import.meta.dir, ".logs")
// Délai maximal d'un service pour être prêt (entrée dans le groupe Kafka comprise)
const READY_TIMEOUT_MS = 180_000
const JOINED = "Consumer has joined the group"

const args = Bun.argv.slice(2)
const skipBuild = args.includes("--skip-build")
const playwrightArgs = args.filter((arg) => arg !== "--skip-build")

const base = { ...parentEnv, LOG_LEVEL: "info", INTERNAL_API_KEY }
const kafka = (clientId: string) => ({ KAFKA_BROKERS, KAFKA_CLIENT_ID: clientId })
const coreEnv = {
    ...base,
    ...kafka("core-backend"),
    DATABASE_URL: databaseUrl("trading_e2e"),
    BETTER_AUTH_URL: URLS.core,
    BETTER_AUTH_SECRET,
    PORT: String(PORTS.core),
    TRUST_PROXY: "0",
    WEB_URL: URLS.web,
    MARKET_SERVICE_URL: URLS.market,
    NOTIFICATION_SERVICE_URL: URLS.notification,
}
const notificationEnv = {
    ...base,
    ...kafka("notification-service"),
    DATABASE_URL: databaseUrl("notifications_e2e"),
    PORT: String(PORTS.notification),
}
const engineEnv = (clientId: string) => ({ ...base, ...kafka(clientId), MARKET_SERVICE_URL: URLS.market })
const webEnv = { ...parentEnv, NEXT_PUBLIC_API_URL: URLS.api }

type Service = { name: string; cwd: string; cmd: string[]; env: Record<string, string | undefined>; ready: string }
const services: Service[] = [
    { name: "market", cwd: web, cmd: ["bun", "e2e/fake-market.ts"], env: base, ready: "listening" },
    { name: "core-backend", cwd: join(apps, "core-backend"), cmd: ["bun", "index.ts"], env: coreEnv, ready: JOINED },
    {
        name: "notification-service",
        cwd: join(apps, "notification-service"),
        cmd: ["bun", "index.ts"],
        env: notificationEnv,
        ready: JOINED,
    },
    {
        name: "backtest-engine",
        cwd: join(apps, "backtest-engine"),
        cmd: ["bun", "index.ts"],
        env: engineEnv("backtest-engine"),
        ready: JOINED,
    },
    {
        name: "risk-engine",
        cwd: join(apps, "risk-engine"),
        cmd: ["bun", "index.ts"],
        env: engineEnv("risk-engine"),
        ready: JOINED,
    },
    {
        name: "web",
        cwd: web,
        cmd: ["bunx", "next", "start", "-p", String(PORTS.web)],
        env: webEnv,
        ready: "Ready",
    },
]

const running: Bun.Subprocess[] = []

/** Lance une commande jusqu'au bout, sortie affichée ; lève si elle échoue. */
async function step(cmd: string[], cwd: string, env: Record<string, string | undefined> = parentEnv) {
    console.log(`\n▶ ${cmd.join(" ")}  (${cwd.replace(`${apps}/`, "")})`)
    const exitCode = await Bun.spawn(cmd, { cwd, env, stdout: "inherit", stderr: "inherit" }).exited
    if (exitCode !== 0) throw new Error(`${cmd.join(" ")} : code ${exitCode}`)
}

/** Démarre un service, journal dans `.logs/<nom>.log`, et attend sa ligne `ready` ; lève s'il s'arrête avant. */
async function start({ name, cwd, cmd, env, ready }: Service) {
    const file = join(logs, `${name}.log`)
    const proc = Bun.spawn(cmd, { cwd, env, stdout: "pipe", stderr: openSync(file, "a") })
    running.push(proc)
    const sink = Bun.file(file).writer()
    const decoder = new TextDecoder()
    let output = ""
    const reader = proc.stdout.getReader()
    const deadline = Date.now() + READY_TIMEOUT_MS
    while (!output.includes(ready)) {
        const chunk = await Promise.race([
            reader.read(),
            Bun.sleep(deadline - Date.now()).then(() => "timeout" as const),
        ])
        if (chunk === "timeout") throw new Error(`${name} pas prêt après ${READY_TIMEOUT_MS / 1000} s : voir ${file}`)
        if (chunk.done) throw new Error(`${name} s'est arrêté au démarrage : voir ${file}`)
        const text = decoder.decode(chunk.value)
        output += text
        sink.write(text)
    }
    console.log(`✓ ${name} prêt`)
    // Le reste du journal continue d'aller dans le fichier, sans bloquer le process
    void (async () => {
        for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) sink.write(chunk.value)
        await sink.end()
    })()
}

async function stop() {
    for (const proc of running) proc.kill("SIGTERM")
    await Promise.all(running.map((proc) => proc.exited))
    await Bun.spawn([...compose, "down", "-v", "--remove-orphans"], { stdout: "ignore", stderr: "inherit" }).exited
}

async function main() {
    mkdirSync(logs, { recursive: true })
    await step([...compose, "up", "-d", "--wait"], web)
    for (const [app, env] of [
        ["core-backend", coreEnv],
        ["notification-service", notificationEnv],
    ] as const) {
        await step(["bun", "run", "db:generate"], join(apps, app), env)
        await step(["bunx", "prisma", "migrate", "deploy"], join(apps, app), env)
    }
    if (!skipBuild) await step(["bunx", "next", "build"], web, webEnv)
    for (const service of services) await start(service)
    const exitCode = await Bun.spawn(["bunx", "playwright", "test", ...playwrightArgs], {
        cwd: web,
        env: { ...parentEnv },
        stdout: "inherit",
        stderr: "inherit",
    }).exited
    process.exitCode = exitCode
}

process.once("SIGINT", () => void stop().then(() => process.exit(130)))
try {
    await main()
} catch (error) {
    console.error(`\n✗ ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
} finally {
    await stop()
}
