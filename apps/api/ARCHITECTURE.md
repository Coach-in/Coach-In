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
  <domain>.controller.ts  HTTP : routes, Swagger, décorateurs d'accès
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

## Authentification et autorisation

Pas de `@nestjs/jwt` : c'est `jsonwebtoken` directement, dans un seul endroit,
`JwtAuthGuard` (`src/auth/`).

```
POST /users/auth/signup  (public)
  ├─ role admin : refusé sauf appelant admin, ou si aucun admin n'existe encore
  ├─ email libre (insensible à la casse), sinon 409
  ├─ bcrypt.hash(password, 10)
  ├─ transaction : User + profil (coach | athlete | admin)
  └─ jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '10d' })

POST /users/auth/login   (public, 10 tentatives / 15 min par IP + email)
  └─ 401 identique pour email inconnu et mauvais mot de passe

GET  /users/me           → utilisateur du token
```

Le payload est volontairement minimal (`{ userId, email }`, type
`TokenContent`) : `JwtAuthGuard` relit l'utilisateur en base à chaque requête.
Le rôle est donc toujours celui de la base, un changement de rôle prend effet
immédiatement et le token d'un compte supprimé cesse de fonctionner.

> `User.refresh_token` **existe mais n'est jamais émis**, et il n'y a pas de
> route `/auth/refresh`. Le token de 10 jours est le seul credential.

### Les trois couches

| Couche | Où | Rôle |
|---|---|---|
| `JwtAuthGuard` (global) | `src/auth/jwt-auth.guard.ts` | Toute route exige un Bearer valide, sauf `@Public()`. Renvoie 401, jamais 500. Pose `request.user` (`AuthUser`) |
| `RolesGuard` (global) | `src/auth/roles.guard.ts` | `@Roles(UserRole.ADMIN)` sur une route ou un contrôleur, sinon 403 |
| Propriété | `src/auth/ownership.ts` | `assertSelfOrAdmin(requester, ownerUserId)` appelé **dans les services** : on ne modifie que sa propre ressource, sauf admin |

Les contrôleurs récupèrent l'appelant avec `@CurrentUser()`, les services
reçoivent `requester: AuthUser` en dernier paramètre.

Routes publiques : `GET /`, `POST /users/auth/signup`, `POST /users/auth/login`,
`GET /coachs` (catalogue web, coachs approuvés seulement), `GET /tags`,
`GET /tags/:id`, `GET /tag-categories`, `GET /tag-categories/:id` (le formulaire
d'inscription en a besoin avant d'avoir un token). Tout le reste exige un token.

---

## Notifications

Une notification est **enregistrée d'abord**, puis diffusée : la base reste la
source de vérité, le flux en direct ne fait que prévenir le client.

```
action métier (transaction)
  ├─ NotificationsService.create(input, manager)   INSERT, jamais de diffusion
  └─ commit
       └─ NotificationsService.publish(notification)   → flux SSE des clients connectés
```

`create` ne publie jamais : l'appelant publie **après** le commit, pour qu'une
action annulée ne prévienne personne. Appelants actuels : `relationships`
(demande, acceptation, refus) et `coach-documents` (diplôme validé ou refusé).

### Modèle
`type` (enum applicatif, colonne texte), `data` (jsonb), `link` (chemin relatif
validé par `isSafeLink`), `readAt` (nullable, `status` reste synchronisé),
`sentAt` (précision milliseconde, indispensable au curseur), `sender`, `receiver`.
Index `(receiver, sentAt)` pour la liste et `sender` pour les suppressions en
cascade. `message` reste un texte français écrit par l'API ; les clients peuvent
le reconstruire depuis `type` et `data`.

### Routes
| Route | Rôle |
|---|---|
| `GET /notifications` | liste, plus récentes d'abord ; `limit`, `cursor`, `unread` ; curseur dans l'en-tête `X-Next-Cursor` |
| `GET /notifications/unread-count` | compteur du badge |
| `POST /notifications/read-all` | tout marquer lu |
| `PATCH /notifications/:id/seen` | marquer lu (idempotent, garde le premier `readAt`) |
| `DELETE /notifications/:id` | supprimer |
| `POST /notifications/stream-ticket` | ticket de 60 s pour ouvrir le flux depuis un navigateur |
| `GET /notifications/stream` | flux en direct (SSE) |

Le curseur est opaque (`date|id` en base64url). Le tri est `sentAt DESC, id DESC`
pour qu'il reste stable entre deux notifications créées à la même milliseconde.
La liste reste un tableau JSON, ce qui garde la compatibilité avec le web et le mobile.

### Flux en direct (SSE)
`NotificationsStream` est un `Subject` RxJS en mémoire : `forUser(userId)` filtre
les notifications adressées à l'utilisateur et ajoute un `heartbeat` toutes les
25 secondes. Un navigateur ne peut pas envoyer d'en-tête `Authorization` avec
`EventSource` : `POST /notifications/stream-ticket` délivre un JWT de 60 secondes,
signé avec un secret dérivé (`JWT_SECRET:notifications-stream`) et un `purpose`
dédié, donc il ne peut pas servir de token d'accès et inversement.
`StreamAuthGuard` vérifie le ticket (ou le Bearer) **avant** l'ouverture du
flux : lancer l'exception dans le handler SSE renverrait un `200` avec un
événement `error`, jamais un `401`. Les journaux HTTP et d'erreurs retirent la
query string pour ne pas écrire le ticket.

Limites connues : une seule instance de l'API (le `Subject` est local ; prévoir
`LISTEN/NOTIFY` de Postgres ou Redis avant de scaler), aucune relecture des
notifications manquées pendant une coupure (le client refait un `GET`), et pas
de push pour un mobile dont l'app est fermée.

### Purge
`NotificationsRetention` supprime au démarrage puis toutes les 24 h les
notifications lues depuis plus de 30 jours et toutes celles de plus de 180 jours
(`NOTIFICATIONS_READ_RETENTION_DAYS`, `NOTIFICATIONS_UNREAD_RETENTION_DAYS`,
`0` désactive la règle). C'est un simple `setInterval`, sans `@nestjs/schedule` ;
avec plusieurs instances elle s'exécute sur chacune, la suppression est idempotente.

---

## Cycle d'une requête

`main.ts` installe, dans l'ordre :

1. en-têtes de sécurité (`nosniff`, `X-Frame-Options`, `Referrer-Policy`),
   `x-powered-by` désactivé ;
2. `ValidationPipe` global (`whitelist`, `transform`) : les champs sans
   décorateur sur le DTO sont **retirés**, ce qui empêche d'écrire
   `isApproved` ou `role` par un `PATCH` ;
3. `AllExceptionsFilter` : garde le format Nest `{ statusCode, message, error }`,
   traduit les erreurs Postgres (23505 → 409, 23503 → 409, 22P02 → 400) et masque
   les erreurs inattendues derrière un 500 générique, loguées côté serveur ;
4. `LoggingInterceptor` et `ClassSerializerInterceptor` : `User.password` et
   `User.refresh_token` portent `@Exclude()` et ne sortent dans **aucune**
   réponse, y compris quand l'utilisateur est imbriqué dans un profil.

`ClassSerializerInterceptor` n'agit que sur des **instances de classe** : un
service doit renvoyer des entités (ou `new User()`), jamais un objet littéral
contenant un utilisateur.

CORS : `CORS_ORIGINS` (liste séparée par des virgules). Sans valeur, tout est
autorisé hors production et rien en production. Swagger n'est exposé qu'hors
production, ou avec `SWAGGER_ENABLED=true`.

## Base de données et migrations

`synchronize` vaut `true` hors production et `false` en production
(`DB_SYNCHRONIZE=true|false` pour forcer). En production les migrations de
`src/database/migrations` sont jouées au démarrage (`migrationsRun`).

```bash
npm run migration:generate -- src/database/migrations/NomDeLaMigration
npm run migration:run
npm run migration:revert
```

Ces commandes lisent `DB_*` dans l'environnement du shell. Toute modification
d'entité doit s'accompagner d'une migration générée. Une base de production
créée auparavant par `synchronize` doit être marquée comme déjà migrée (insérer
la migration initiale dans la table `migrations`) ou recréée.

## Décisions en place, et leur coût

| Décision | Pourquoi | Ce que ça coûte |
|---|---|---|
| `synchronize` actif hors production | Itération rapide en dev | Dev et prod n'utilisent pas le même chemin de schéma |
| Rôle en `string` sur `User` | Simplicité du schéma | Pas de type-sécurité, pas de contrainte en base |
| Profils en tables séparées | Auth simple, profils homogènes | Jointure par contrôle d'accès ; l'inscription est transactionnelle |
| `jsonwebtoken` en direct | Pas de dépendance supplémentaire | Pas de refresh token, pas de révocation avant expiration (hors suppression du compte) |
| Limiteur de login en mémoire | Pas de dépendance supplémentaire | Compteurs perdus au redémarrage et non partagés entre instances |
| MinIO via SDK S3 | Compatible avec un vrai S3 en prod | Config double endpoint à maintenir |
| `eager: true` sur `User`, `Athlete`, `Coach`, `Notification` | Évite des jointures explicites ; réponses stables pour web et mobile | Sur-tire le graphe d'entités à chaque `find()`, y compris sur les listes |
| Enums pour `status` (relationships, notifications) | Contrainte en base | — (bon choix, à étendre à `User.role`) |

## Ce qui n'est pas testé, et pourquoi

Les contrôleurs sont peu testés (`users.controller` seulement) : ce sont
essentiellement des décorateurs Swagger et de la délégation au service. Les
règles d'accès sont testées là où elles vivent : `JwtAuthGuard`, `RolesGuard`,
`ownership` et les services.
