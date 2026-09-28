# Coach'In API

API REST du projet Coach'In — NestJS + TypeORM + PostgreSQL + MinIO.

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — modules, modèle de données, flux d'authentification, décisions et leurs coûts.
- **[../doc/conventions.md](../doc/conventions.md)** — comment écrire du code sur ce projet.

---

## Prérequis

| Outil | Version | Obligatoire |
|---|---|---|
| Node.js | 24 (cf. CI) | oui |
| npm | 11 | oui |
| Docker + Compose | récent | oui (Postgres + MinIO) |

## Démarrage

Depuis la **racine du dépôt** :

```bash
# 1. Variables d'environnement de l'API (le fichier est gitignoré)
cp apps/api/.env.example apps/api/.env
#    puis remplacer JWT_SECRET par une vraie valeur :
#    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 2. Démarrer l'infrastructure (Postgres + MinIO + API + web)
docker compose up -d

# 3. Dépendances npm de l'API
cd apps/api && npm ci
```

Si l'API ne démarre pas au premier `docker compose up` : elle dépend de
`service_healthy` sur Postgres **et** MinIO. En cas d'échec,
`docker compose up -d` de nouveau suffit une fois les dépendances saines.

### Vérification

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Swagger (la doc la plus à jour) | http://localhost:3000/api/docs |
| Front web | http://localhost:3001 |
| Console MinIO | http://localhost:9001 (`minioadmin` / `minioadmin`) |
| Postgres | `localhost:5432` (`coachin`) |

Le schéma est créé **automatiquement** au démarrage
(`synchronize: true`, `app.module.ts:47`). Aucune migration n'existe.

---

## Variables d'environnement

Lues via `ConfigModule` (`isGlobal`). Voir `apps/api/.env.example`.

| Variable | Rôle | Défaut |
|---|---|---|
| `JWT_SECRET` | signature des JWT | **aucun** → l'API refuse de signer |
| `DB_HOST` / `DB_PORT` | Postgres | — |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | identifiants | — |
| `MINIO_ENDPOINT` | S3 **interne** (conteneur) | `http://minio:9000` |
| `MINIO_PUBLIC_ENDPOINT` | S3 **public** (navigateur) | `http://localhost:9000` |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | credentials S3 | `minioadmin` |
| `MINIO_BUCKET` | bucket des documents | `coach-documents` |
| `PORT` | port d'écoute | `3000` |

`MINIO_ENDPOINT` et `MINIO_PUBLIC_ENDPOINT` sont **volontairement différents** :
l'API signe les URL avec l'endpoint interne, mais le navigateur doit pouvoir
atteindre l'API MinIO via `localhost:9001`/`:9000` exposé par la stack. Voir
[ARCHITECTURE.md](./ARCHITECTURE.md#stockage-des-documents--minio).

---

## Commandes

Toutes depuis `apps/api`.

| Action | Commande |
|---|---|
| Démarrer (watch, swc) | `npm run start:dev` |
| Démarrer (build) | `npm run build` |
| Tests unitaires | `npm test` |
| Tests en watch | `npm run test:watch` |
| Couverture | `npm run test:cov` |
| E2E (**nécessite** une DB/MinIO up) | `npm run test:e2e` |
| Lint (corrige) | `npm run lint` |
| Format | `npm run format` |
| Vérification type seule | `npx tsc --noEmit` |

`npm test` **n'a besoin de rien** : tous les dépôts et clients S3 sont mockés.
`npm run test:e2e` est le seul qui parle au vrai Postgres et au vrai MinIO.

---

## Tests

- **Unitaires** (`src/**/*.spec.ts`) — Jest, sans base de données.
  C'est ce que la CI exécute.
- **E2E** (`test/*.e2e-spec.ts`) — supabaseur une vraie instance.
  Exclus de la CI pour l'instant.

```bash
npm test                              # tout
npm test -- --coverage                # avec couverture
npm test -- -t "bcrypt"               # filtrer par nom de test
npm test -- users.service             # un seul fichier
```

Convention : le nom d'un test décrit **le comportement**, pas la méthode.
`it('stores a bcrypt hash instead of the plain-text password')`, jamais
`it('should call bcrypt')` ni `it('should be defined')`.

---

## CI

`.github/workflows/ci-backend.yml`, 4 jobs :

| Job | Commande | Bloquant |
|---|---|---|
| `compile` | `npx tsc --noEmit` | oui |
| `lint` | `eslint` (sans `--fix`) | non (`continue-on-error`) |
| `unit` | `jest --ci` | oui |
| `docker-compose` | `docker compose config --quiet` | oui |

Déclenché sur `pull_request` vers `dev`/`main`, et sur `push` vers
`dev`/`main` (+ `ci-create`, temporaire, à retirer).
