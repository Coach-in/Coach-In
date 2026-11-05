# Coach'In — Suivi backend & CI

> Créé le 2026-09-28 après revue de `apps/api` + `docker-compose.yml` + docs `Idealisation/`.

## Rappel URLs (après `docker compose up`)

| Service | URL |
|---|---|
| Swagger (docs API) | <http://localhost:3000/api/docs> |
| API racine | <http://localhost:3000> |
| Web (Next.js) | <http://localhost:3001> |
| MinIO console | <http://localhost:9001> |
| MinIO API | <http://localhost:9000> |
| Postgres | `localhost:5432` |

`SwaggerModule.setup('api/docs', ...)` est dans `src/main.ts:28` et il n'y a **pas** de
`setGlobalPrefix` → pas de `/api` devant les routes (`/users`, `/coachs`, `/relationships`…).

---

## P0 — Bloquants CI

- [x] **Specs boilerplate remplacées.** Les 5 specs `providers: [XService]` qui ne
      résolvaient pas leurs dépendances ont été supprimées ou réécrites.
      4 supprimées (`coachs` ×2, `athletes` ×2 — elles ne testaient rien :
      `expect(service).toBeDefined()`).
      3 réécrites avec de vrais mocks : `users.service` (10), `tags.service` (6),
      `relationships.service` (7), `users.controller` (4) → **28 tests verts**.
- [x] **Workflow de vérification des documents coach** (`coach-documents.service.spec.ts`,
      14 tests) : `coach-documents.service` était à **0%** de couverture alors que c'est
      tout le parcours de certification (upload → accept/refuse). Couvre `onModuleInit`
      (création du bucket), `upload` (clé `coach-documents/{coachId}/{uuid}.{ext}`),
      `findAll` (URL signée 900s), `accept` (approve + suppression S3 **et** DB),
      `refuse` (suppression **sans** approve). → **94% stmts, 100% fonctions**.
- [x] **`notifications.service` (6 tests)** et **`coachs.service` (10 tests)** ajoutés →
      couverture globale **33.8% → 48.2%**. `coachs.findAll()` est maintenant épinglé :
      il ne doit renvoyer que des coachs `isApproved: true`.
      → **58 tests verts** au total.
- [x] **`update()` écrase les tags** (`coachs.service.ts:51`, `athletes.service.ts:46`) :
      `coach.tags = tagNames ? ... : []` → un `PATCH { bio: "..." }` **sans** `tagNames`
      supprime **tous** les tags du profil. Perte de données silencieuse.
      `coachs.service.spec.ts` ne couvre volontairement pas `update()` : écrire un test
      qui fige ce comportement admettrait le bug comme attendu. À fixer puis tester.
- [x] **`accept()` n'est pas transactionnel** (`coach-documents.service.ts:186-200`) :
      approve le coach → supprimer l'objet S3 → supprimer la ligne en base. Si le
      `remove()` échoue, l'objet S3 est déjà gone et la ligne survit → toutes les URLs
      signées suivantes pointent dans le vide. De plus un échec lève une erreur
      *après* avoir approuvé le coach (l'admin voit une erreur sur une approval réussie).
      Le test `accept` documente l'ordre actuel, il ne corrige rien.
      *Fait :* approbation et suppression de la ligne dans une transaction, après la suppression S3 (rejouable).
- [x] **`.dockerignore` absent** dans `apps/api` → `Dockerfile:8` (`COPY . .`) embarque
      `node_modules` **et le `.env` local** dans l'image.
- [x] **`start:prod` cassé** : `node dist/main -b swc` (`package.json:14`) → flag invalide
      passé à node. Et le Dockerfile ne fait aucun `nest build`.
      *Fait :* `node dist/main` ; Dockerfile multi-étapes (`production` / `development`).
- [x] **`.env.example` racine incomplet** : `apps/api/.env` créé (secret frais, `chmod 600`,
      gitignoré). Le `.env.example` **racine** est complété (le job CI ne l'utilise pas,
      il utilise `apps/api/.env.example`).
- [x] **ESLint `recommendedTypeChecked`** (`eslint.config.mjs`) → 100 erreurs pré-existantes
      (69 = prettier, 31 = `no-unsafe-*`). Le job `lint` est en `continue-on-error: true`
      → rapporte sans bloquer. **Passer en bloquant après le push de la mise au propre.**
      *Fait :* 0 erreur ; le job `lint` est bloquant.
- [x] **`.github/workflows/ci-backend.yml` ajouté.** Déclenche sur `pull_request`
      (`dev`, `main`) et sur `push` (`dev`, `main` + **`ci-create` temporairement**),
      4 jobs : `compile` (tsc), `lint` (non bloquant), `unit` (jest),
      `docker-compose` (config). Pas d'e2e / npm audit / CodeQL / gitleaks pour l'instant.
      *Rappel :* `docker-compose` valide le `docker-compose.yml` **racine**, donc aussi
      le service `web`. 3 jobs sur 4 sont strictement `apps/api`.
      *À retirer après validation :* `ci-create` du trigger `push`.

## P1 — Sécurité / données

- [x] **Aucun `ValidationPipe` global** dans `main.ts` → **tous les décorateurs
      `class-validator` des DTO ne sont jamais exécutés**.
- [x] **`synchronize: true`** (`app.module.ts:47`) et **zéro migration** → risque de perte
      de données. Passer à `synchronize: false` + `src/database/migrations/`.
      *Fait :* `false` en production avec migrations jouées au démarrage ; `true` hors production. Migration initiale dans `src/database/migrations`.
- [x] **Fuite de secrets dans les réponses** : `users.service.ts` renvoie l'entité `User`
      complète → hash bcrypt + `refresh_token` dans le JSON sur
      `POST /users/auth/login`, `GET /users`, `GET /users/me`, `GET /users/:id`.
      → `@Exclude()` + `ClassSerializerInterceptor` ou des `*.response.dto.ts`.
- [x] **`update()` écrit le password en clair** (`users.service.ts:107`) : `UpdateUserDto`
      hérite de `CreateUserDto` et le hash n'est pas refait.
- [x] **Pas de guard / pas de rôles.** N'importe qui peut :
      s'inscrire avec `role: "admin"`, `PATCH /users/:id` un autre compte,
      `POST /relationships/:id/accept`, lister les documents « admin only ».
- [x] **`jwt.verify` dupliqué 5×** (`users`, `coachs`, `admins`, `relationships`,
      `notifications`) au lieu d'un `JwtAuthGuard`. Token valable **10 jours**, la colonne
      `refresh_token` existe mais n'est jamais utilisée.
      *Fait :* un seul `JwtAuthGuard`. Le token reste valable 10 jours et `refresh_token` n'est toujours pas utilisé.
- [x] `POST /coachs` est public → n'importe qui peut créer un profil coach.
- [x] CORS `origin: '*'` (`main.ts:12`).
      *Fait :* `CORS_ORIGINS`, fermé par défaut en production.
- [x] `UnauthorizedException('Email already in use')` → devrait être `ConflictException`.

## P2 — Qualité / dette

- [x] Healthcheck API absent → `web` dépend de `api` sans condition
      (`docker-compose.yml:77`).
- [x] Aucune gestion d'erreur centralisée (`HttpExceptionFilter`).
- [x] `mysql2` en dépendance morte (le projet est sur `pg`).
- [x] `@types/uuid@^10` vs `uuid@^13` → conflit de types.
- [x] `eager: true` sur toutes les relations **+** `QueryBuilder` avec joins redondants
      (`relationships.service.ts`).
      *Fait :* les jointures redondantes de `relationships.service` sont supprimées ; `eager` est conservé car web et mobile dépendent des réponses imbriquées.
- [x] `relationships.service.ts` : `(athlete as any).user_id` → cast sur une colonne
     inexistante dans l'entité, avec un fallback QueryBuilder bricolé.
- [x] `findOneId` renvoie `null` au lieu de lever un `NotFoundException`
      alors que le Swagger annonce un 404.
- [x] `tags.entity.ts` : relation en string `'TagCategory'` + `category?: any`.
- [x] `TagsSeedService` fait du N+1 au bootstrap.
- [x] Aucune transaction sur la signup (user + profil + tags).
- [x] DocAlignement : `README.md` décrit `backend/` (le dossier s'appelle `apps/api`) et
      des routes inexistantes (`/api/connections`, programmes, chat, posts).
      `Idealisation/schema-api.md` est le **vrai** spec à traiter.
      *Fait :* `README.md` racine aligné sur les routes réelles ; `Idealisation/schema-api.md` n'a pas été touché.

---

## Plan CI proposé (`.github/workflows/ci-backend.yml`)

## État actuel de la CI (`.github/workflows/ci-backend.yml`)

Implémenté. Déclenche sur `push` et `pull_request` (`dev`, `main`), avec `concurrency`
pour annuler les runs périmés. Ne pas toucher `push_to_mirror.yaml`.

| Job | Commande | Bloque le merge ? |
|---|---|---|
| `compile` | `tsc --noEmit` | **oui** (vert, exit 0) |
| `lint` | `eslint {src,apps,libs,test}/**/*.ts` | **oui** |
| `unit` | `jest --ci` | **oui** (58 tests verts) |
| `docker-build` | `docker build --target production apps/api` | **oui** |
| `docker-compose` | `docker compose config --quiet` | **oui** (vert) |

`apps/api/.env` est créé depuis `.env.example` dans le job compose avant la validation.

### Étapes suivantes (dans cet ordre)

1. ~~Passer `lint` en bloquant.~~ Fait.
2. Ajouter un job `migrate` (typeorm `migration:run` sur DB éphémère) une fois
   `synchronize: false` en place.
3. Ajouter `e2e` avec un `services: postgres:16-alpine` — reste non bloquant
   (c'est la source de flake).
4. Ajouter `security` (npm audit `--audit-level=high`, gitleaks, CodeQL) en
   rapport seul.
5. ~~`docker build apps/api`~~ Fait (job `docker-build`).

Bonnes pratiques déjà en place : `actions/setup-node@v4` avec `cache: 'npm'` et
`cache-dependency-path: apps/api/package-lock.json` (le lock existe).

## Conventions de code à respecter

- **Migrations plutôt que `synchronize`.** Seeds dans `src/database/seeds/*.ts` lancés par
  script (`npm run seed`), plus de `OnApplicationBootstrap`.
- `main.ts` : `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Nouveau module `auth/` : `JwtModule.registerAsync`, `JwtAuthGuard` global + `@Public()`,
  `@Roles()` guard.
- Règles métier dans le **service**, jamais dans le controller.
- Style du repo : Prettier `singleQuote` + `trailingComma: all`, fichiers kebab-case,
  entités au singulier / modules au pluriel, **Swagger décoratif très riche** (signatures
  de l'équipe — garder ce niveau sur chaque nouvel endpoint).

## Reste à faire (hors périmètre des correctifs)

- Refresh token : la colonne `refresh_token` n'est toujours pas utilisée et le mobile appelle `/api/auth/refresh`, qui n'existe pas.
- Supprimer `eager: true` côté API (réponses plus légères) une fois web et mobile adaptés.
- `helmet` et un vrai rate limiting partagé (`@nestjs/throttler`) : demandent d'ajouter des dépendances.
- Épingler la version de l'image `minio/minio`.
- Contrainte d'unicité sur `User.username` (le Swagger l'annonce déjà).
- Index unique `lower(email)` : l'unicité actuelle repose sur la normalisation en minuscules à l'écriture.
- Ajouter un job `migrate` en CI (migration jouée sur une base éphémère).
