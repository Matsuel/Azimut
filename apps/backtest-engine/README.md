# backtest-engine

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Sondes

Le worker n'expose que ses sondes, sur `HEALTH_PORT` (défaut 8003) : `GET /liveness` (toujours `200`) et `GET /readiness` (`200` ou `503`, contrôle `kafka` : consumer et producer prêts). Détails : `AGENTS.md`, section « Sondes ».

This project was created using `bun init` in bun v1.4.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
