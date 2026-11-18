import { defineConfig, devices } from "@playwright/test"
import { isCI, URLS } from "./e2e/env"

// Parcours E2E contre la stack lancée par `e2e/stack.ts` (`bun run e2e`) : ne démarre aucun serveur lui-même.
// Fichiers `*.e2e.ts` : `bun test` du web ramasse les `*.spec.ts` et `*.test.ts`, pas ceux-ci.
export default defineConfig({
    testDir: "./e2e",
    testMatch: /.*\.e2e\.ts$/,
    // Un backtest passe par Kafka et deux engines : jusqu'à une minute avant son résultat
    timeout: 120_000,
    expect: { timeout: 15_000 },
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    reporter: isCI ? [["list"], ["html", { open: "never" }]] : [["list"]],
    use: {
        baseURL: URLS.web,
        locale: "fr-FR",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        { name: "setup", testMatch: /auth\.setup\.ts$/ },
        {
            name: "desktop",
            use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
            dependencies: ["setup"],
            testIgnore: /mobile\.e2e\.ts$/,
        },
        {
            name: "mobile",
            use: { ...devices["Pixel 7"], storageState: "e2e/.auth/user.json" },
            dependencies: ["setup"],
            testMatch: /mobile\.e2e\.ts$/,
        },
    ],
})
