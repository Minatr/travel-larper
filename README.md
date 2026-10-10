# Travel Larper

> Organise tes voyages comme un pro, même si tu ne l'es pas.

Travel Larper est une application web pour préparer, vivre et faire le bilan de ses voyages, seul ou à plusieurs. Le nom assume le clin d'œil : avec l'appli, n'importe qui peut « larper » l'organisateur de voyage chevronné.

- **Explorer** : choisir un pays sur un globe interactif et consulter ses informations essentielles.
- **Préparer** : enregistrer les lieux qui nous intéressent (restos, clubs, monuments...) et les répartir en journées d'activités proches les unes des autres.
- **Vivre le voyage** : consulter son programme, noter ses dépenses et partager ses photos, sur ordinateur comme sur téléphone.
- **Faire le bilan** : comparer le coût estimé au coût réel, répartir les dépenses entre voyageurs façon Tricount, et se comparer à ses voyages précédents.

L'inscription est ouverte, mais chaque compte doit être validé par un administrateur avant de pouvoir utiliser l'application.

## Stack

| Partie | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, MapLibre GL |
| Backend | Go, architecture MVC |
| Base de données | PostgreSQL + PostGIS |
| Contrat d'API | OpenAPI |

## Lancer le projet

### Prérequis

- [Docker](https://docs.docker.com/get-docker/) avec Docker Compose
- Make
- Go et Node.js (pour le backend et le frontend, une fois en place)

### Démarrage

```bash
git clone <adresse-du-depot>
cd travel-larper
cp .env.example .env
make dev
```

`make dev` démarre PostgreSQL + PostGIS sur le port indiqué dans `.env` (5432 par défaut). Le backend et le frontend s'y ajouteront au fil des tickets.

### Commandes utiles

| Commande | Effet |
| --- | --- |
| `make help` | Liste toutes les commandes |
| `make dev` | Lance l'environnement de développement |
| `make db-up` / `make db-down` | Démarre ou arrête la base (les données sont conservées) |
| `make db-psql` | Ouvre un terminal SQL dans la base |
| `make db-logs` | Affiche les logs de la base |
| `make db-reset` | Supprime et recrée la base (perte des données locales) |

### En cas de problème

- **Le port 5432 est déjà utilisé** (un PostgreSQL installé sur la machine) : changer `POSTGRES_PORT` et le port de `DATABASE_URL` dans `.env`.
- **Docker ne répond pas** : vérifier que Docker Desktop est lancé.

## Contribuer

- Aucun push direct sur `main` : tout passe par une pull request (PR), approuvée par l'autre développeur, avec une pipeline au vert.
- Nom de branche et titre de PR : `<type>/TL-<numéro du ticket>_<description-courte>`, par exemple `feat/TL-12_connexion-utilisateur`. Types : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`. La branche et le titre ont le même type et le même numéro.
- À l'ouverture d'une PR, son auteur est assigné et la revue est demandée à l'autre développeur automatiquement.
- Avant d'ouvrir une PR : `make lint` et `make test`.
