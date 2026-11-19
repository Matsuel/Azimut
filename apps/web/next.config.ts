import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
    reactCompiler: true,
    // Paquet du monorepo en TypeScript source (`@azimut/utils/roles`) : Next doit le transpiler
    transpilePackages: ["@azimut/utils"],
}

// Branche `src/i18n/request.ts` (chemin par défaut du plugin)
export default createNextIntlPlugin()(nextConfig)
