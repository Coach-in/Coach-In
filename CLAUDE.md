# Coach'In

Platform connecting athletes with certified coaches (diploma-verified). Monorepo with three apps. The product README (in French) is `README.md`.

This Claude account is shared by four people. Check who you are working with before touching code, and stay inside their area (see "Team & ownership").

## Repo layout

| Path | Stack | Notes |
|---|---|---|
| `apps/api` | NestJS 11, TypeORM, PostgreSQL, S3/MinIO (`@aws-sdk/client-s3`), Swagger, Jest | Modules: `admins`, `athletes`, `coachs`, `coach-documents`, `notifications`, `relationships`, `tags`, `users`, `config`, `utils` |
| `apps/web` | Next.js 16 (App Router), React 19, Tailwind 4, React Compiler | Code in `apps/web/src/app` |
| `apps/mobile/coach_in` | Flutter (Dart SDK ^3.9.2) | `lib/screens`, `lib/services` (`api_service`, `oauth_service`), `lib/config/api_config.dart` |
| `apps/doc` | Markdown | Verification docs |
| `Idealisation/` | PDFs, mockups, audits | Project-management assets, not code. **Do not modify.** |

Infra: `docker-compose.yml` runs postgres (:5432), minio (:9000, console :9001), api (:3000) and web (:3001, mapped to container port 3000). CI (`.github/workflows/push_to_mirror.yaml`) only mirrors the repo; there are no automated tests in CI, so run checks locally.

## Team & ownership

| Person | Area |
|---|---|
| Celian | Backend (`apps/api`) |
| Kerwan | Backend (`apps/api`) |
| Luigi | Web frontend (`apps/web`) |
| Robin | Mobile frontend (`apps/mobile`) |

- Work in the area of the person you are talking to. If the task requires changing another area, say so and ask before editing.
- If you don't know who the user is, ask before making non-trivial changes.

## Commands

API (`apps/api`):
- `npm run start:dev` (watch), `npm run build`
- `npm run lint` (runs eslint with `--fix`), `npm run format`
- `npm test`, `npm run test:e2e`

Web (`apps/web`): `npm run dev`, `npm run build`, `npm run lint`

Mobile (`apps/mobile/coach_in`): `flutter pub get`, `flutter run`, `flutter analyze`, `flutter test`

Infra: `docker compose up postgres minio` for just the backing services, or `docker compose up` for everything. Developers run things differently (some use Docker for the apps, some run natively), so don't assume one setup.

## Definition of done

Before calling work finished, run and report the result of:
- **API:** `npm run lint` and `npm test`. Add spec files (next to the service/controller) for new backend logic.
- **Web:** `npm run lint` and `npm run build`
- **Mobile:** `flutter analyze` and `flutter test`

If a check fails or can't be run, say so explicitly.

## Git workflow

- Flow: **feature branch -> `dev` -> `main`**. Branch off `dev`; PRs target `dev`.
- **Commit messages:** English, conventional commits, e.g. `feat(frontend): implemented notifications modal`, `fix(api): ...`. Use a scope for the area (`api`, `frontend`, `mobile`).
- Claude may create commits but **never pushes** and never commits directly to `main` or `dev`. The user pushes and opens the PR.
- Don't stage unrelated files (e.g. a dirty `package-lock.json` that isn't part of the task).

## Language

- Code, comments, identifiers, commit messages, technical docs: **English**.
- User-facing UI strings and the product README: **French**.
- Reply to the user in the language they write in.

## Guardrails

- **Secrets:** never read, print, or quote `.env` files or `info_admin_account.txt`. Use the `.env.example` files for variable names (`apps/api/.env.example`: `JWT_SECRET`, `DB_*`, `MINIO_*`).
- **API contracts:** endpoints, DTOs, and response shapes are consumed by both web and mobile. Ask before changing them, and flag the change so the web/mobile devs can adapt.
- **Dependencies:** ask before adding or upgrading packages (npm or `pubspec.yaml`).
- **Database schema:** outside production TypeORM runs with `synchronize: true` (`apps/api/src/app.module.ts`), so entity changes alter your local schema automatically and can drop or alter data. In production `synchronize` is off and migrations in `apps/api/src/database/migrations` run at startup, so every entity change needs a matching migration (`npm run migration:generate` against a database that only has the previous migrations applied, then review the SQL). Ask before changing entities or relationships.

## Known quirks

- Mobile API base URL is hardcoded in `apps/mobile/coach_in/lib/config/api_config.dart` (LAN IP + port 3000). Don't commit a personal IP change unless it's the intent of the task.
- Web has both `profilesportif` and `profilsportif` folders under `src/app`; check which one is in use before editing.
- `apps/web` uses `NEXT_PUBLIC_API_URL` (http://localhost:3000 in docker-compose) to reach the API.
