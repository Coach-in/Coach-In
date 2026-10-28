# Coach'In

> *Mettre du sens, de l'éthique et de l'humain dans un milieu qui en manque cruellement.*

---

## Le projet

**Coach'In** est une plateforme de mise en relation entre sportifs et coachs certifiés, née d'un constat simple : le coaching en ligne est aujourd'hui saturé par les réseaux sociaux, la désinformation et des acteurs non qualifiés. Les bons coachs peinent à émerger. Les sportifs ne savent plus à qui faire confiance.

Coach'In veut changer ça, pas en ajoutant du bruit, mais en structurant, simplifiant et humanisant l'accès au coaching de qualité.

---

## Problème

Le coaching en ligne souffre de plusieurs dérives profondes :

- Des coachs non diplômés qui dominent grâce aux algorithmes, pas à leurs compétences
- Une pression des réseaux sociaux qui pousse les vrais professionnels à se "vendre" plutôt qu'à coacher
- Des sportifs perdus face à une offre illisible, avec des risques réels de se blesser ou se faire arnaquer
- Des outils existants (Excel, apps rigides et payantes) qui ne répondent pas aux besoins réels des coachs
- Une offre de coaching uniquement pensée en abonnements longs et coûteux, sans flexibilité

---

## Notre réponse

Une plateforme pensée pour **tous les niveaux**, à la fois outil de gestion pour les coachs et interface de mise en relation pour les sportifs.

### Pour les sportifs
- Recherche de coachs par discipline, niveau, budget et disponibilité
- Profils certifiés et vérifiés (diplômes contrôlés)
- Suivi personnalisé : performances, historique, objectifs / données privées, accessibles uniquement au coach
- Flexibilité totale : séance unique, retour vidéo, accompagnement ponctuel ou long terme

### Pour les coachs
- Profil détaillé valorisant compétences et certifications, pas l'image
- Outils de programmation intelligents : duplication, templates, alertes, calcul automatique des % / RPE
- Gestion centralisée des suivis sans dépendance aux réseaux sociaux
- Moins de charge cognitive, plus de temps pour coacher

---

## Différenciateurs clés

| Fonctionnalité | MyFitnessPal | Hitch | TrainMe | **Coach'In** |
|---|:---:|:---:|:---:|:---:|
| Tracking sportif | ✅ | ✅ | ✅ | ✅ |
| Outil de création d'entraînement | ❌ | ❌ | ❌ | ✅ |
| Mise en relation coach/sportif | ❌ | ✅ | ✅ | ✅ |
| Réseau social de demande de coaching | ❌ | ❌ | ❌ | ✅ |
| Coachs certifiés et valorisés | ❌ | ✅ | ✅ | ✅ |
| Espace sportif + coach complet | ❌ | ❌ | ❌ | ✅ |

---

## Stack technique

```
Frontend          →  Flutter (iOS & Android) · Next.js 14 (Web / SSR)
Backend         →  NestJS (REST API · Guards · Pipes · Modules)
ORM             →  TypeORM (Migrations · Entities · Repositories)
Base de données →  PostgreSQL (ACID · Relations · JSON)
Infra           →  Docker Compose · CI/CD · Cloud Provider
```

### Principaux endpoints API

| Domaine | Routes |
|---|---|
| Auth | `POST /users/auth/signup` · `POST /users/auth/login` · `GET /users/me` |
| Utilisateurs | `GET /users` (admin) · `GET/PATCH/DELETE /users/:id` (soi-même ou admin) |
| Coachs | `GET /coachs` (public) · `GET /coachs/me` · `GET/PATCH/DELETE /coachs/:id` |
| Athlètes | `GET /athletes/me` · `GET/PATCH/DELETE /athletes/:id` |
| Relations | `POST /relationships` · `GET /relationships` · `POST /relationships/:id/accept` · `POST /relationships/:id/refuse` |
| Notifications | `GET /notifications` · `PATCH /notifications/:id/seen` · `DELETE /notifications/:id` |
| Vérification des coachs | `POST /coach-documents/upload/:coachId` · `GET /coach-documents` (admin) · `POST /coach-documents/:id/accept` · `…/refuse` (admin) |
| Tags | `GET /tags` · `GET /tag-categories` (public) · création et suppression réservées aux admins |

Toutes les routes exigent un `Authorization: Bearer <token>` sauf celles marquées publiques. La liste à jour est dans Swagger (`/api/docs`).

---

## Personas cibles

**Julien, 34 ans Coach indépendant diplômé**
Veut développer une activité stable sans dépendre des réseaux. Cherche une plateforme qui valorise ses compétences réelles, pas son image.

**Sarah, 41 ans Coach en force et prévention**
Utilise Coach'In pour gérer ses suivis, accéder aux profils privés de ses sportifs et travailler avec flexibilité dans un cadre éthique.

**Tom, 26 ans Sportif en musculation**
Cherche un accompagnement sérieux, veut éviter les faux coachs et les conseils contradictoires des réseaux. A besoin de confiance et de structure.

---

## Philosophie

> "Les coachs ne quittent pas Excel par amour d'Excel. Ils y restent par peur de perdre le contrôle."

Coach'In ne cherche pas à imposer un changement, mais à proposer une alternative qui donne **plus de liberté, moins d'erreurs, et plus de sens** au travail de coaching.

Pas d'algorithme de visibilité. Pas de like. Pas de promesses irréalistes.  
Juste des professionnels sérieux, des sportifs motivés, et les outils pour les connecter.

---

## Structure du dépôt

```
/
├── apps/
│   ├── api/             # NestJS API (auth, users, coachs, athletes, admins,
│   │                    #   coach-documents, relationships, notifications, tags)
│   ├── mobile/          # Flutter (iOS & Android)
│   └── web/             # Next.js 14
├── docker-compose.yml
└── README.md
```

---

## Lancer le projet

### Avec Docker

```bash
# Cloner le dépôt
git clone https://github.com/votre-org/coachin.git
cd coachin

# Copier les variables d'environnement
cp .env.example .env

# Démarrer les services avec Docker Compose
docker compose up

# L'API sera disponible sur http://localhost:3000
# Le frontend web sur http://localhost:3001
# PostgreSQL sur localhost:5432
```

### Développement local

Tout (PostgreSQL, MinIO, API, web) se lance avec Docker :

```bash
# à faire une fois
cp apps/api/.env.example apps/api/.env   # puis remplacer JWT_SECRET

# Postgres + MinIO + API + web
docker compose up -d

# dépendances de l'API (si vous lancez l'API hors Docker)
cd apps/api && npm ci
```

| Service | URL |
|---|---|
| Front web | http://localhost:3001 |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |

Détails : [`apps/api/README.md`](apps/api/README.md)

---

## Documentation technique

| Document | Contenu |
|---|---|
| [`apps/api/README.md`](apps/api/README.md) | setup, commandes, variables d'env |
| [`apps/api/ARCHITECTURE.md`](apps/api/ARCHITECTURE.md) | modules, modèle de données, auth, décisions et leurs coûts |
| [`apps/doc/conventions.md`](apps/doc/conventions.md) | comment écrire du code ici, tests, avant la PR |
| [`apps/doc/VerificationsCoach.md`](apps/doc/VerificationsCoach.md) | spécification du parcours de vérification coach |
| [`Idealisation/`](Idealisation/) | documents de conception (schéma d'API, audits, ADR) |

---

*Coach'In est né d'un vécu réel et d'une envie profonde de remettre du sens dans un milieu qui en manque.*