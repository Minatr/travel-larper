# Commandes du projet. `make help` pour la liste.

-include .env
export

COMPOSE := docker compose

# Valeurs par défaut si .env est absent (mêmes que docker-compose.yml).
POSTGRES_USER ?= travel
POSTGRES_DB ?= travel

.DEFAULT_GOAL := help
.PHONY: help dev down db-up db-down db-logs db-psql db-reset backend frontend test lint format generate migrate

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

test: ## Lance les tests du backend dans Docker
	$(COMPOSE) run --rm --build --no-deps backend go test ./...

# lint et format utilisent les outils installés sur la machine (voir README),
# comme les vérifications Lefthook avant chaque commit.
lint: ## Vérifie lint et formatage, backend et frontend (outils locaux)
	cd backend && golangci-lint run ./...
	cd frontend && npm run lint && npm run format:check

format: ## Formate le code, backend et frontend (outils locaux)
	cd backend && golangci-lint fmt
	cd frontend && npm run format

generate: ## Génère le code depuis OpenAPI et sqlc (pas encore configuré)
	@echo "Pas encore configuré : à venir avec le ticket contrat d'API."

migrate: ## Applique les migrations (pas encore configuré)
	@echo "Pas encore configuré : à venir avec le premier ticket qui crée une table."
