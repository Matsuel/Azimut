# notification-service

Microservice Express 5 + Kafka, port 8002, **avec sa propre base PostgreSQL `notifications`** (Prisma). Consomme `notification.requested` (publié par core-backend après chaque transition gardée), enregistre la notification de façon idempotente (`dedupKey` unique), la pousse au flux SSE de son propriétaire, expose liste, compteur et « lu » derrière le proxy de core-backend, et purge les notifications de plus de `NOTIFICATION_RETENTION_DAYS` jours. **Il ne rend aucun texte** : le web traduit le type et les valeurs. Roadmap 15 (`roadmap/15-notification-service/README.md`, D1 à D16). **Calqué sur `apps/market-service`** (HTTP, clé interne) et `apps/risk-engine` (consumer) ; lis leurs `AGENTS.md` et `../core-backend/AGENTS.md`.

**Jamais appelé par le web** : core-backend (`/api/notifications/*`) vérifie la session, pose `x-user-id` et la clé interne `x-internal-key` (= `INTERNAL_API_KEY`) ; sans elles, ou sans `x-user-id`, `401` (`internal-auth.middleware.ts`, sauf `GET /health`). Ne pas exposer ce service publiquement. Il n'écrit que dans sa base `notifications` ; il ne lit ni n'écrit la base `trading`.

## Architecture en couches

```
consumers/ ┐
routes/    →  controller/  →  services/  →  repositories/  →  PostgreSQL `notifications`
(HTTP)        (HTTP)          (métier)       (Prisma)
```

Dossiers : `routes/`, `controller/`, `consumers/`, `services/`, `repositories/`, `interfaces/`, `middleware/`, `constants/`, `utils/`, `prisma/`, `generated/` (jamais édité). Nommage `<domaine>.<couche>.ts`, `export default`, comme core-backend ; crée un dossier uniquement quand un fichier en a besoin.

## Règles par couche

- **Controller** : valide `req` avec le schéma zod de `interfaces/` (`BadRequestError` si invalide), appelle **une** méthode de service, répond. Méthodes en propriétés fléchées ; `userId` vient de `res.locals.userId` (posé par le middleware, jamais du body ni de la query).
- **Consumer** : valide le message avec le schéma d'événement de `@azimut/contracts`, appelle **une** méthode de service. Message invalide → `logger.warn` et retour, sans exception.
- **Service** : décide. Catégorie déduite du type, enregistrement idempotent, diffusion SSE, autorisation (notification d'un autre utilisateur → `NotFoundError`), purge. Ne connaît ni `req`/`res` ni `prisma`.
- **Repository** : Prisma Client uniquement (aucun SQL écrit à la main). Une méthode par besoin d'accès. Aucune règle métier, aucune `AppError`.
- Les erreurs se **lancent** ; seul `errorMiddleware` (`@azimut/http`) formate la réponse.
- Kafka est at-least-once : un rejeu (même `dedupKey`) n'insère rien et ne diffuse rien. Un handler qui lève (base indisponible) laisse kafkajs rejouer.
- Env via `env.ts` (zod) ; logs via `Logger.here()` ; Routes documentées dans `API.md` dès leur création.

## Migrations

`bun run db:migrate` puis `bun run db:generate`. Une migration déjà appliquée est figée : tout changement de schéma passe par une nouvelle migration. Tests : base `notifications_test` (jamais `DATABASE_URL`, forcée par `test/setup.ts`) ; tests de repository ignorés si PostgreSQL est éteint.

## Commandes

```bash
bun run index.ts
bun test
bunx tsc --noEmit
```
