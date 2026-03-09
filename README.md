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
| Auth | `POST /api/auth/login` · `POST /api/auth/register` · `GET /api/auth/me` |
| Utilisateurs | `GET /api/users/:id` · `GET /api/users/coaches/:id` |
| Connexions | `POST /api/connections` · `GET /api/connections` |
| Programmes | `GET/POST/PATCH/DELETE /api/programmes/:id` |
| Exercices | `GET /api/exercices` · CRUD sur `/api/programmes/:id/exercises` |
| Chat | `POST/PATCH/DELETE /api/message` · `GET /api/chat/:userId` |
| Posts | CRUD sur `/api/posts` |

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
│   ├── mobile/          # Flutter (iOS & Android)
│   └── web/             # Next.js 14
├── backend/             # NestJS API
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── programmes/
│   │   ├── exercises/
│   │   ├── chat/
│   │   └── posts/
│   └── ...
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

```bash
# Backend API
cd apps/api
npm install
npm run start:dev

# Frontend Web (dans un autre terminal)
cd apps/web
npm install
npm run dev
```

**Note :** Nécessite PostgreSQL installé localement et configuré selon `apps/api/.env`

---

*Coach'In est né d'un vécu réel et d'une envie profonde de remettre du sens dans un milieu qui en manque.*