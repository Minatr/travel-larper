# Commandes du projet. `make help` pour la liste.

-include .env
export

COMPOSE := docker compose

# Valeurs par défaut si .env est absent (mêmes que docker-compose.yml).
POSTGRES_USER ?= travel
POSTGRES_DB ?= travel

.DEFAULT_GOAL := help
.PHONY: help dev down db-up db-down db-logs db-psql db-reset backend frontend test lint format audit generate migrate-new

help: ## Affiche cette aide
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev: ## Lance base + backend + frontend avec rechargement automatique (Ctrl+C pour arrêter)
	$(COMPOSE) up --build --watch

down: ## Arrête tous les services (les données sont conservées)
	$(COMPOSE) down

db-up: ## Démarre PostgreSQL + PostGIS seul et attend qu'il soit prêt
	$(COMPOSE) up -d --build --wait db

db-down: ## Arrête PostgreSQL (les données sont conservées)
	$(COMPOSE) stop db

db-logs: ## Affiche les logs de PostgreSQL
	$(COMPOSE) logs -f db

db-psql: ## Ouvre un terminal SQL dans la base
	$(COMPOSE) exec db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

db-reset: ## Supprime et recrée la base (perte des données locales)
	$(COMPOSE) down -v
	$(COMPOSE) up -d --build --wait db

backend: ## Lance la base et le backend Go seuls
	$(COMPOSE) up --build --watch backend

frontend: ## Lance la pile complète, frontend compris (il a besoin de l'API)
	$(COMPOSE) up --build --watch frontend

test: ## Lance les tests du backend (Docker) et du frontend (outils locaux)
	$(COMPOSE) run --rm --build --no-deps backend go test ./...
	cd frontend && npm test

# lint et format utilisent les outils installés sur la machine (voir README),
# comme les vérifications Lefthook avant chaque commit.
lint: ## Vérifie lint et formatage, backend et frontend (outils locaux)
	cd backend && golangci-lint run ./...
	cd frontend && npm run lint && npm run format:check

format: ## Formate le code, backend et frontend (outils locaux)
	cd backend && golangci-lint fmt
	cd frontend && npm run format

audit: ## Cherche les failles connues dans les dépendances (outils locaux)
	cd backend && go tool govulncheck ./...
	cd frontend && npm audit --omit=dev --audit-level=high

generate: ## Génère le code depuis api/openapi.yaml et les requêtes SQL (outils locaux)
	cd backend && go generate ./... && go tool sqlc generate
	cd frontend && npm run generate

# Les migrations s'appliquent au démarrage du backend : cette cible crée
# seulement le fichier, numéroté à la suite du dernier.
migrate-new: ## Crée une migration vide : make migrate-new name=add_role
	@echo "$(name)" | grep -qE '^[a-z0-9_]+$$' || { echo "Usage : make migrate-new name=<minuscules_chiffres_underscores>"; exit 1; }
	@last=$$(ls backend/migrations | grep -E '^[0-9]+_.*\.sql$$' | sort | tail -n 1 | cut -d_ -f1); \
	file=backend/migrations/$$(printf '%05d' $$(expr $${last:-0} + 1))_$(name).sql; \
	printf -- '-- +goose Up\n\n-- +goose Down\n' > $$file; \
	echo "Créé : $$file"
