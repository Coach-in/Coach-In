# Conventions backend

Comment écrire du code dans `apps/api` pour qu'il soit cohérent avec
l'existant. Les règles que **le linter** vérifie ne sont pas répétées ici : elles
sont exécutées, pas documentées.

- **Ce que la CI vérifie** → `.github/workflows/ci-backend.yml`
- **Ce que fait l'API aujourd'hui** → [../api/README.md](../api/README.md)
- **Pourquoi c'est construit comme ça** → [../api/ARCHITECTURE.md](../api/ARCHITECTURE.md)

---

## Langue

| Quoi | Langue | Exemple |
|---|---|---|
| Code, identifiants, noms de fichiers, commits | **anglais** | `findOrCreateByNames`, `coach-documents.service.ts` |
| Commentaires, docs, messages d'erreur destinés aux devs | **français** | `// Ne supprime le coach que s'il existe` |

Exception à surveiller : le module s'appelle `coachs` (et non `coaches`) alors
que tous les autres modules sont en anglais. C'est une décision historique, pas
une règle. Ne propagez pas la forme « français pour un module sur deux » dans
le code : si le renommage se fait, il se fait en une fois et pour tous.

---

## Nommage

Cohérent avec NestJS, donc **ne rien dévier** :

| Élément | Suffixe / forme |
|---|---|
| Module | `<domaine>.module.ts` |
| Contrôleur | `<domaine>.controller.ts` |
| Service | `<domaine>.service.ts` |
| Entité | `<domaine>.entity.ts` (`tag-category.entity.ts` pour les pluriels) |
| DTO entrée | `create-<x>.dto.ts`, `update-<x>.dto.ts` |
| DTO réponse | `<x>.response.dto.ts` (quand la sortie doit être filtrée) |
| Test | `<x>.service.spec.ts` — à côté du source, jamais dans `test/` |

- Dossier **`dto/`** et **`entities/`** en minuscules dans chaque module.
- Noms de variables et de fonctions en `camelCase`, classes en `PascalCase`.
- `async` partout, pas de `Promise` dans le nom (`findAll`, pas `getAllAsync`).
- Colonnes de jointure en `snake_case` explicite :
  `@JoinColumn({ name: 'coach_id' })` — ne jamais laisser TypeORM deviner.

---

## Où va la logique

La règle unique, et elle est stricte :

> **Un contrôleur ne contient aucune logique métier.**

| Layer | Autorisé | Interdit |
|---|---|---|
| `*.controller.ts` | décorateurs HTTP/Swagger, extraction du token, `return service.x()` | `if` métier, accès repository, requête SQL |
| `*.service.ts` | règles métier, appel repository, appel MinIO | `Request`/`Response` express, décorateur `@Get` |
| `*.entity.ts` | colonnes, relations | comportement |

Un contrôleur qui dépasse 20 lignes est un contrôleur qui veut devenir un
service. Si le prochain contributeur doit lire le contrôleur **et** le service
pour comprendre une route, la répartition est mauvaise.

---

## Ajouter une fonctionnalité

### Nouveau module

1. `nest g resource <domaine>` depuis `apps/api` (ou créer la structure à la main).
2. **Enregistrer l'entité dans `app.module.ts`** (`entities: [...]`, ligne 36).
   C'est le piège n°1 : les entités sont listées explicitement, une entité
   oubliée n'est jamais créée en base et le service échoue à l'injection.
3. `*.module.ts` : `TypeOrmModule.forFeature([Entity])` + `controllers` + `providers`.
4. Si l'entité a des relations, décider `eager: true` ou `false` — et assumer le
   coût (voir ARCHITECTURE).

### Nouvelle route

1. DTO dans `dto/`, avec **tous** les `class-validator`. Ils ne sont pas
   exécutés aujourd'hui (pas de `ValidationPipe` global) : les écrire quand même,
   ils serviront le jour où le pipe arrive.
2. Méthode dans le service qui **lève** les exceptions métier
   (`NotFoundException`, `UnauthorizedException`) et retourne la donnée.
3. Route dans le contrôleur, avec `@ApiBearerAuth()` + `@ApiOperation` +
   `@ApiResponse` — Swagger est la doc la plus à jour, ne pas la laisser
   derrière.
4. **Un test unitaire dans la même PR.** Voir plus bas.

---

## Tests

Ce sont des tests **unitaires** : un service, ses dépendances mockées, aucune
base de données. C'est ce que la CI exécute (`jest --ci`), et `npm test` ne
demande ni Postgres ni MinIO.

### Écrire un bon test

Le nom décrit **le comportement observable**, à la troisième personne :

```ts
it('stores a bcrypt hash instead of the plain-text password', async () => { ... })  // oui
it('flips the status to seen and persists it', async () => { ... })                  // oui
it('should be defined', () => { ... })   // non : ne peut pas échouer
it('calls the repository', () => { ... }) // non : teste l'implémentation
```

Un test qui passe sur du code vide n'est pas un test. Si on peut casser la
fonction et que le test reste vert, il est inutile.

### Mocker un repository

Toujours le même squelette (`Test.createTestingModule` + `getRepositoryToken`),
et toujours un `beforeEach` qui **recrée** les mocks — sinon l'état de
`jest.fn()` fuit d'un test à l'autre :

```ts
const tagRepositoryMock = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };

beforeEach(async () => {
  jest.clearAllMocks();
  const module = await Test.createTestingModule({
    providers: [
      TagsService,
      { provide: getRepositoryToken(Tag), useValue: tagRepositoryMock as unknown as Repository<Tag> },
    ],
  }).compile();
  service = module.get<TagsService>(TagsService);
});
```

- Ne mocker que les méthodes utilisées : un mock trop large cache les régressions.
- Rejeter plutôt que résoudre `undefined` pour tester un cas d'erreur :
  `mockRejectedValue(new Error('S3 delete failed'))`.
- Un service qui logge (`Logger.error`) avant de relancer fait drowned le rapport
  de test. Voir `coach-documents.service.spec.ts` qui mocke `Logger.prototype`.

### Mocker `@aws-sdk/client-s3`

Le service construit **deux** `S3Client` dans son constructeur. Pour les
tests, mocker la classe :

```ts
const mockSend = jest.fn<Promise<unknown>, [unknown]>();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
  return { ...actual, S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })) };
});
```

`jest.requireActual` garde les vraies classes de commandes, donc
`expect(cmd).toBeInstanceOf(PutObjectCommand)` fonctionne. Et pour inspecter :

```ts
expect(mockSend.mock.calls[0][0].input).toEqual({ Bucket: ..., Key: ... });
```

> Deux pièges TypeScript avec `@types/jest` : les variables référencées dans
> une factory `jest.mock()` doivent s'appeler `mock*` (hoisting), et
> `jest.fn` prend **deux** arguments de type (`jest.fn<Return, Args>[]`),
> pas un.

### Couverture

`npm run test:cov` pour la mesurer. Ne pas la chase : ce qui compte est que le
comportement décrit soit vérifié. Voir [ARCHITECTURE.md](../api/ARCHITECTURE.md)
pour ce qui n'est volontairement pas couvert.

---

## Avant d'ouvrir une PR

```bash
npx tsc --noEmit     # compile
npm test             # tests
npm run lint         # corrige le formatable ; ne corrige pas no-unsafe-*
```

Si `npm run lint` réécrit des fichiers, **relire le diff** : `--fix` ne touche
que ce qui est auto-correctible et peut réindenter du code que vous n'aviez pas
vu.

Puis vérifier que Swagger affiche bien la route et qu'elle apparaît dans la
doc — c'est le premier endroit où un contributeur regardera.

---

## Choses à ne pas faire

- **Ne pas ajouter de logique dans un contrôleur** (voir « Où va la logique »).
- **Ne pas écrire un test qui fige un bug.** Si le code est faux, le test doit
  échouer ou être écrit après le correctif. `coachs.service.spec.ts` ne couvre
  volontairement pas `update()`, qui écrase les tags quand `tagNames` est absent :
  un test « les tags sont vidés » transformerait le bug en comportement attendu.
- **Ne pas créer d'entité sans la lister dans `app.module.ts`.**
- **Ne pas exposer une entité TypeORM en réponse d'API** si elle porte un
  secret — c'est ce qui fait fuiter `password` et `refresh_token` aujourd'hui.
  Filtrer via un `*.response.dto.ts`.
- **Ne pas `console.log`.** Le `LoggingInterceptor` log déjà method/url/status/durée.
- **Ne pas supprimer** un fichier sans demander. Le backend est nettoyé en parallèle.
