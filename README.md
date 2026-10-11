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

- [Docker](https://docs.docker.com/get-docker/) avec Docker Compose (v2.22+ pour Compose Watch)
- Make (facultatif). Sous Windows : `winget install ezwinports.make`, puis rouvrir le terminal.

Pour lancer l'application, Go et Node.js ne sont **pas** nécessaires : backend et frontend tournent dans Docker.

Pour **développer** (lint, formatage, vérifications avant chaque commit), installer aussi :

| Outil | Version | Windows | Mac |
| --- | --- | --- | --- |
| Go | 1.27+ | `winget install GoLang.Go` | `brew install go` |
| Node.js | 24.x | `winget install OpenJS.NodeJS.LTS` | `brew install node@24` |
| golangci-lint | 2.14+ | `winget install GolangCI.golangci-lint` | `brew install golangci-lint` |
| Lefthook | 2.x | `npm install -g lefthook` | `brew install lefthook` |

Puis, une fois par clone du dépôt :

```bash
cd frontend && npm ci && cd ..   # outils du frontend (ESLint, Prettier)
lefthook install                 # active les vérifications avant chaque commit
```

Sous Windows, ne pas installer Lefthook avec `go install` : sa compilation échoue avec Go 1.27.

### Démarrage

```bash
git clone <adresse-du-depot>
cd travel-larper
cp .env.example .env
make dev        # sans make : docker compose up --build --watch
```

`make dev` démarre la base (PostgreSQL + PostGIS), le backend Go et le frontend Vite, avec rechargement automatique quand le code change. Ouvrir ensuite http://localhost:5173 : la page indique si l'API et la base répondent.

Le détail de l'environnement (rôle de chaque conteneur, variables, passage en production) est dans [docs/environnement.md](docs/environnement.md).

### Commandes utiles

| Commande | Effet |
| --- | --- |
| `make help` | Liste toutes les commandes (sous Windows : depuis Git Bash) |
| `make dev` | Lance base + backend + frontend (`Ctrl+C` pour arrêter) |
| `make down` | Arrête tous les conteneurs (les données sont conservées) |
| `make test` | Lance les tests du backend |
| `make lint` | Vérifie le lint et le formatage (backend + frontend) |
| `make format` | Formate le code (backend + frontend) |
| `make db-up` / `make db-down` | Démarre ou arrête la base seule (les données sont conservées) |
| `make db-psql` | Ouvre un terminal SQL dans la base |
| `make db-logs` | Affiche les logs de la base |
| `make db-reset` | Supprime et recrée la base (perte des données locales) |

### En cas de problème

- **Le port 5432, 8080 ou 5173 est déjà utilisé** : changer `POSTGRES_PORT`, `API_PORT` ou `FRONTEND_PORT` dans `.env` (et le port de `DATABASE_URL` pour 5432).
- **Docker ne répond pas** : vérifier que Docker Desktop est lancé.
- **`http proxy error ... ECONNREFUSED` dans les logs du frontend** : le backend est en train de compiler, il répond dès que `server listening` apparaît.

## Contribuer

- Aucun push direct sur `main` : tout passe par une pull request (PR), approuvée par l'autre développeur, avec une pipeline au vert.
- Nom de branche et titre de PR : `<type>/TL-<numéro du ticket>_<description-courte>`, par exemple `feat/TL-12_connexion-utilisateur`. Types : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`. La branche et le titre ont le même type et le même numéro.
- À l'ouverture d'une PR, son auteur est assigné et la revue est demandée à l'autre développeur automatiquement.
- Avant d'ouvrir une PR : `make lint` et `make test`.
