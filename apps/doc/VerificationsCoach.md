# Vérification des professionnels du sport en France
## Problématique d'automatisation pour Coach'In

---

## Contexte

Dans la philosophie de Coach'In, la vérification des diplômes et des qualifications des coachs est un pilier fondamental. L'un des problèmes centraux identifiés dans le milieu du coaching en ligne est la prolifération de coachs non diplômés qui, grâce aux réseaux sociaux, parviennent à se constituer une clientèle sans posséder les qualifications nécessaires.

Pour y remédier, la question s'est posée naturellement : **est-il possible d'exploiter une API officielle recensant l'ensemble des professionnels du sport diplômés en France, afin d'automatiser et de fiabiliser le processus de vérification lors de l'inscription d'un coach sur la plateforme ?**

---

## État des lieux : ce qui existe

### Le portail officiel du Ministère des Sports

Le Ministère des Sports met à disposition un moteur de recherche public accessible à l'adresse `recherche-educateur.sports.gouv.fr`. Ce portail recense l'ensemble des éducateurs sportifs déclarés, titulaires d'une carte professionnelle en cours de validité. 

Il permet de rechercher un professionnel par nom, prénom et discipline. Chaque carte professionnelle est également associée à un **QR Code** qui, une fois scanné, renvoie vers les informations actualisées relatives aux qualifications de l'éducateur.

### Absence d'API publique ouverte

Malgré l'existence de ce portail, **il n'existe à ce jour aucune API publique officielle** permettant d'interroger programmatiquement cette base de données. Le portail `data.gouv.fr` ne propose pas non plus de données structuré et régulièrement mis à jour sur les professionnels du sport certifiés.

En résumé : la donnée existe, elle est publique, mais elle n'est **pas exposée sous un format exploitable techniquement** dans le cadre d'une intégration API standard, mais permettrait une vérification sûr à la main.

---

## Options envisageables

### Option A, Vérification manuelle par upload de diplôme

C'est l'approche adoptée par les plateformes sérieuses du secteur comme Hitch ou TrainMe. Le coach fournit lors de son inscription un scan ou une photo de son diplôme. Un administrateur valide ensuite manuellement le document avant d'activer le profil.

**Avantages**
- Simple à mettre en place dès le MVP
- Aucune dépendance à un service externe
- Contrôle total sur le processus de vérification
- Cohérent avec la philosophie humaine de Coach'In

**Inconvénients**
- Nécessite une intervention manuelle pour chaque inscription coach
- Temps de traitement variable selon le volume

En somme, les inconvénients sont principalement liés à la charge administrative, mais ils sont largement compensés par la fiabilité et l'éthique de la démarche. De plus, cette méthode peut être optimisée avec des outils de gestion de documents et des workflows internes pour accélérer le processus de validation.

---

### Option B, Vérification croisée via le numéro de carte professionnelle

Le coach renseigne son **numéro de carte professionnelle** lors de l'inscription. L'administrateur vérifie ensuite manuellement sur `recherche-educateur.sports.gouv.fr` ou via le QR Code associé à la carte.

**Avantages**
- Adossé à une source officielle du Ministère des Sports
- Permet une vérification ciblée et rapide
- Le numéro de carte est un identifiant unique et traçable

**Inconvénients**
- Toujours non automatisable sans développement supplémentaire
- Le coach doit connaître et renseigner son numéro de carte

---

## Recommandation retenue pour Coach'In

Au regard des contraintes identifiées et de la philosophie du projet, la solution recommandée pour le MVP est une **combinaison des options A et B** :

```
Inscription coach
       ↓
Saisie : nom, spécialité, diplôme principal, numéro de carte pro (optionnel)
       ↓
Upload du scan du diplôme → stocké de manière sécurisée sur le backend
       ↓
Profil en attente — badge "Vérification en cours"
       ↓
Validation manuelle par un administrateur Coach'In
       ↓
Profil activé — badge "Coach certifié ✓"
```

Cette approche est à la fois **fiable, éthique et réaliste** dans le cadre d'un MVP. Elle peut évoluer vers une vérification semi-automatisée si le Ministère des Sports venait à ouvrir une API officielle dans le futur, ou si un partenariat institutionnel était envisagé.

