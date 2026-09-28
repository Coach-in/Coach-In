# Architecture backend

Comment le backend est construit, **pourquoi**, et ce que chaque décision coûte.
Ce document décrit le *projet*, pas NestJS : le framework est supposé connu.

Pour la doc d'exploitation (setup, commandes) → [README.md](./README.md).
Pour « comment écrire du code ici » → [../doc/conventions.md](../doc/conventions.md).

---

## Vue d'ensemble

```
apps/web  (Next.js :3001)
    │  fetch + JWT Bearer
    ▼
apps/api  (NestJS :3000)  ──►  Postgres :5432
    │                          MinIO   :9000 (S3)
    ▼
  Swagger /api/docs
```

Le `docker-compose.yml` **racine** déclare 4 services : `postgres`, `minio`,
`api`, `web`. L'API attend que Postgres et MinIO soient sains
(`depends_on: condition: service_healthy`) et se recharge à chaud sur
`./apps/api/src`.

---

## Modules

Un module par domaine. Chaque module suit le même triplet :

```
<domain>/
  <domain>.module.ts      déclare ce que le module expose et importe
  <domain>.controller.ts  HTTP : routes, Swagger, extraction du token
  <domain>.service.ts     logique métier, repository TypeORM
  dto/                    entrées/sorties validées
  entities/               entités TypeORM
  <domain>.service.spec.ts  tests unitaires
```

| Module | Rôle | Points d'attention |
|---|---|---|
| `users` | Authn : signup, login, CRUD utilisateur. **Possède le profil de tous les autres** | Le seul module qui écrit sur `User` |
| `coachs` | Profils coach, tags, approbation | `findAll()` ne renvoie que `isApproved: true` |
| `athletes` | Profils sportif | |
| `admins` | Profils admin | |
| `tags` | Tags + catégories, seed automatique au démarrage | 2 contrôleurs dans 1 module |
| `relationships` | Mise en relation sportif ↔ coach, avec notifications | Machine à états + effets de bord |
| `notifications` | Notifications utilisateur | |
| `coach-documents` | Upload/validation des diplômes, **MinIO** | Créneau S3, voir plus bas |
| `utils` | `LoggingInterceptor`, `TokenContent`, `UserRole` | Pas un module Nest |

### Graphe de dépendances

`users` **importe** `coachs`, `athletes` et `admins` : l'inscription crée le
`User` *puis* le profil correspondant, en une transaction logique. C'est le
seul point de couplage fort entre profils, et il est intentionnel — un compte
sans profil n'est pas un compte utilisable.

```
users ──► coachs ──► tags
   │         │
   ├─► athletes
   │
   └─► admins

relationships ──► athletes, coachs, notifications
coach-documents ──► coachs        (via Coach)
```

---

## Modèle de données

9 entités (`app.module.ts:36-46`, listées explicitement — pas de
auto-load des dossiers).

```
                 User (role: string)
                   │ 1:1 eager
       ┌───────────┼───────────┐
     Coach      Athlete       Admin
       │                       
       │ M:N ──── Tag (join: coach_tags)
       │
       │ 1:N ◄── CoachDocument  (diplôme, S3)
       │
       └── 1:N ◄── Relationship ──► Athlete
                  pending → accepted | refused
                                │
                                └── 1:N ──► Notification ──► User (sender, receiver)
```

### `User` porte le rôle, les autres sont des profils

`User.role` est une colonne texte (`@Column({ default: 'athlete' })`).
`Admin` / `Athlete` / `Coach` sont des tables **séparées** liées par un
`OneToOne` vers `User` — pas d'héritage de table.

**Pourquoi :** l'authentification n'a besoin que de `User` (email + mot de
passe + rôle). Un `OneToOne` garde chaque profil avec ses propres colonnes et
ses propres règles.

**Ce que ça coûte :**

- Toute vérification de rôle = une jointure (`User` → profil). Il n'existe
  aucune garantie au niveau du type qu'un `admin` possède bien une ligne `Admin`.
- L'inscription crée 1 ou 2 lignes : il n'y a pas de rollback. Un `Coach` créé
  sans `User` valide est possible si le second `save` échoue.
- `UserRole` existe en enum TypeScript (`utils/types/jwt.types.ts`) mais
  **n'est pas utilisé comme type de colonne** : `role` reste un `string`.
  Une typo passe la compilation et la base.

### `isApproved` est la porte de confiance du projet

`Coach.isApproved` (défaut `false`) est controlled par
`coach-documents`, via le parcours :

```
POST /coach-documents/upload/:coachId   →  Multer → MinIO (bucket privé) + ligne CoachDocument
POST /coach-documents/:id/accept       →  coach.isApproved = true, puis objet S3 supprimé
POST /coach-documents/:id/refuse       →  objet S3 supprimé, coach inchangé
```

`GET /coachs` ne liste que les coachs approuvés. C'est **seul** filet de
sécurité du projet : sans document validé, un coach est invisible. Le test
`coachs.service.spec.ts` épingle ce comportement, parce que supprimer le
`where: { isApproved: true }` ne casse rien d'autre.

> `accept()` n'est pas transactionnel : approve → suppression S3 → suppression
> en base. Si la dernière étape échoue, l'objet est gone et la ligne survit,
> et toutes les URLs signées suivantes pointent dans le vide.

### Stockage des documents — MinIO

- Client S3 AWS (`@aws-sdk/client-s3`), `forcePathStyle: true`, région `us-east-1`.
- **Deux clients** : `s3` (interne, `MINIO_ENDPOINT`) pour upload/suppression,
  `s3Public` (`MINIO_PUBLIC_ENDPOINT`) pour signer. Le navigateur ne peut pas
  joindre `http://minio:9000`, donc les URL doivent être signées avec l'endpoint
  public.
- Clé : `coach-documents/{coachId}/{uuid}.{ext}`.
- URLs **presignées**, `expiresIn: 900` (15 min) → jamais de bucket public.
- Le bucket est créé au démarrage si absent (`onModuleInit` → `HeadBucket`
  puis `CreateBucket`).

---

## Flux d'authentification

Pas de `@nestjs/jwt` : c'est `jsonwebtoken` directement.

```
POST /users/auth/signup
  ├─ vérifie l'email libre
  ├─ bcrypt.hash(password, 10)
  ├─ jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '10d' })
  └─ crée le profil correspondant au role (coach | athlete | admin)

POST /users/auth/login   → bcrypt.compare, puis même token
GET  /users/me           → vérifie le Bearer, puis userRepository.findMe
```

Le payload est volontairement minimal (`{ userId, email }`, type
`TokenContent`) : le rôle est relu en base à chaque requête, donc un changement
de rôle prend effet immédiatement.

> `User.refresh_token` **existe mais n'est jamais émis** : il est mis à `null`
> partout et il n'y a pas de route `/auth/refresh`.

### Le problème de l'extraction du token

Six contrôleurs (`users`, `coachs`, `athletes`, `admins`, `relationships`,
`notifications`) recopient le même bloc :

```ts
const authHeader = request.headers.authorization;
const token = authHeader?.split(' ')[1];
const decoded = jwt.verify(token, secret) as TokenContent;
```

C'est de l'**authentification** (le token est-il valide ?), pas de
**vérification d'accès** (cette personne a-t-elle le droit ?). Il n'y a **aucun
guard** dans l'application, et trois contrôleurs n'extraient même pas de token :
`coach-documents` (3 routes : upload, accept, refuse), `tags` et
`tag-categories` (création et suppression de tags). Le reste de l'API est
« authentifié » mais jamais « autorisé ». Un `JwtAuthGuard` + des `@Roles()`
remplaceraient les six copies d'un coup.

---

## Cycle d'une requête

`main.ts` installe un seul interceptor global, `LoggingInterceptor`
(`${method} ${url} → ${status} (${ms}ms)`), et **aucun** pipe global.

Conséquence directe et non intuitive : **les décorateurs `class-validator` des
DTO ne sont jamais exécutés**. Un `CreateUserWithProfileDto` peut arriver avec
`role: 'admin'` et un email invalide, et TypeORM l'acceptera. Ajouter
`ValidationPipe` dans `main.ts` est une modification d'une ligne qui change
le comportement de toute l'API.

## Décisions en place, et leur coût

| Décision | Pourquoi | Ce que ça coûte |
|---|---|---|
| `synchronize: true` | Zéro migration à gérer en dev | Perte de données possible ; **aucune** stratégie de migration |
| Rôle en `string` sur `User` | Simplicité du schéma | Pas de type-sécurité, pas de contrainte en base |
| Profils en tables séparées | Auth simple, profils homogènes | Jointure par contrôle d'accès ; pas de rollback inscription |
| `jsonwebtoken` en direct | Pas de dépendance supplémentaire | Extraction du token dupliquée 6 fois, pas de guard |
| MinIO via SDK S3 | Compatible avec un vrai S3 en prod | Config double endpoint à maintenir |
| `eager: true` sur `User`, `Athlete`, `Coach`, `Notification` | Évite des jointures explicites | Sur-tirer le graphe d'entités à chaque `find()`, y compris sur les listes |
| Enums pour `status` (relationships, notifications) | Contrainte en base | — (bon choix, à étendre à `User.role`) |

## Ce qui n'est pas testé, et pourquoi

Les contrôleurs ne sont pas testés, à une exception près (`users.controller`).
Ce ne serait pas rentable : c'est essentiellement des décorateurs Swagger et
de la délégation au service. Tester la duplication du token six fois serait du
gaspillage — la supprimer (guard) est la vraie réponse.

