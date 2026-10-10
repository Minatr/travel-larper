# Environnement : développement et base de déploiement

Ce document décrit comment l'environnement de développement est construit (ticket TL-0) et ce qu'il faudra changer pour le déployer. La configuration de production n'est **pas** écrite : elle viendra avec le ticket de déploiement.

## 1. Vue d'ensemble

Tout tourne dans Docker. Sur la machine, il suffit d'avoir Docker Desktop (et `make`, facultatif) : ni Go, ni Node ne sont nécessaires.

```
Navigateur ──► frontend (Vite, :5173) ──/api──► backend (Go, :8080) ──► db (PostgreSQL + PostGIS, :5432)
```

| Service | Image | Rôle en dev |
| --- | --- | --- |
| `db` | `postgis/postgis:17-3.5` | Base de données, données conservées dans le volume `db-data` |
| `backend` | `backend/Dockerfile.dev` (Go 1.27) | `go run ./cmd/server`, recompilé à chaque redémarrage |
| `frontend` | `frontend/Dockerfile.dev` (Node 24) | Serveur Vite avec rechargement à chaud |

### Pourquoi un proxy `/api` ?

Le navigateur ne parle qu'au serveur Vite, qui transmet les appels `/api/*` au backend. Front et API partagent donc la même origine : **pas de CORS à configurer**, et les futurs cookies de session (`SameSite`) fonctionnent sans réglage particulier. En production, le reverse proxy jouera exactement le même rôle (voir section 4).

### Pourquoi Compose Watch plutôt qu'un montage de dossier ?

Sous Windows, un dossier monté dans un conteneur ne transmet pas les événements « fichier modifié » : ni Vite ni un outil de rechargement Go ne verraient les changements. Compose Watch (`docker compose up --watch`) copie lui-même les fichiers modifiés dans le conteneur :

| Fichiers modifiés | Action |
| --- | --- |
| `backend/**/*.go` | copie + redémarrage du backend (`go run` recompile, ~quelques secondes) |
| `backend/go.mod`, `go.sum` | reconstruction de l'image |
| `frontend/src/**` | copie, Vite recharge la page à chaud |
| `frontend/package.json`, `package-lock.json` | reconstruction de l'image |

Pendant la recompilation du backend, Vite affiche `http proxy error ... ECONNREFUSED` : c'est normal, l'API revient dès que le log `server listening` apparaît.

## 2. Lancer et vérifier

```bash
cp .env.example .env
make dev            # ou, sans make : docker compose up --build --watch
```

Puis ouvrir http://localhost:5173 : la page affiche l'état de l'API et de la base. La route de santé est aussi joignable directement :

```bash
curl http://localhost:8080/api/health
# {"status":"ok","database":"up"}         -> HTTP 200
# {"status":"degraded","database":"down"} -> HTTP 503 (base arrêtée)
```

`Ctrl+C` arrête la surveillance ; `make down` arrête les conteneurs (les données restent).

### `make` sous Windows

`make` s'installe avec `winget install ezwinports.make` (rouvrir le terminal ensuite). Les commandes Docker (`make dev`, `make test`, `make db-psql`…) marchent depuis PowerShell. `make help` utilise `grep` et `awk` : le lancer depuis **Git Bash**. Chaque commande `make` correspond à une commande `docker compose` visible dans le `Makefile`, utilisable directement si besoin.

## 3. Variables d'environnement

| Variable | Utilisée par | Remarque |
| --- | --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `db`, et pour construire l'URL du backend | |
| `POSTGRES_PORT`, `API_PORT`, `FRONTEND_PORT` | ports **exposés sur la machine** | à l'intérieur de Docker, les ports restent 5432, 8080 et 5173 |
| `DATABASE_URL` (`.env`) | outils lancés **sur la machine** (`localhost`) | le conteneur backend reçoit sa propre URL, qui vise l'hôte `db` |
| `API_PROXY_TARGET` | Vite | fixé par `docker-compose.yml` à `http://backend:8080` |

## 4. Vers la production

### Ce qui change entre dev et prod

| | Dev (aujourd'hui) | Prod (ticket de déploiement) |
| --- | --- | --- |
| Backend | `go run`, image Go complète (~300 Mo) | build multi-étapes : binaire statique (`CGO_ENABLED=0`) dans une image minimale (~20 Mo) |
| Frontend | serveur Vite | `npm run build` → fichiers statiques servis par le reverse proxy ; plus de Node en prod |
| Proxy `/api` | Vite | reverse proxy (Caddy, Nginx ou Traefik, à choisir), qui gère aussi HTTPS |
| Base | port 5432 ouvert sur la machine | port **non exposé** : seul le backend y accède par le réseau Docker |
| Secrets | `.env` local avec valeurs factices | variables d'environnement du serveur, mots de passe forts, jamais dans Git |
| Fichiers | `Dockerfile.dev`, `docker-compose.yml` | `Dockerfile` (prod) par service + un fichier Compose de prod séparé |

Le code applicatif n'a rien à changer : il lit sa configuration depuis l'environnement (`DATABASE_URL`, `API_PORT`) et le frontend appelle `/api` en chemin relatif.

### Hébergement gratuit : points d'attention

- **Une VM (ex. Oracle Cloud « Always Free ») est la cible la plus simple** : on y installe Docker et on lance le même type de Compose, base comprise. Les offres « conteneur » (Fly.io, Render, Cloud Run…) hébergent bien le backend, mais une base PostgreSQL gratuite et durable y est rarement incluse. Les conditions des offres gratuites changent souvent : à revérifier au moment du ticket.
- **Architecture ARM** : les VM gratuites d'Oracle sont en ARM (`arm64`). Les images `golang`, `node` et `caddy` existent en `arm64`, mais **`postgis/postgis` est publiée uniquement en `amd64`** (vérifié le 10/10/2026). Options à trancher le moment venu : une VM `amd64`, une image PostGIS communautaire multi-architecture, ou une image maison basée sur `postgres:17` avec le paquet PostGIS.
- **Mémoire** : prévoir le build des images sur la machine de dev ou en CI (GitHub Actions), puis les pousser sur un registre (ex. GitHub Container Registry). Une petite VM n'a pas à compiler elle-même.
- **Sauvegardes** : la base vit dans un volume Docker ; les sauvegardes automatiques vers R2 (voir CLAUDE.md, section Sécurité) sont à mettre en place avant d'y stocker de vraies données.
