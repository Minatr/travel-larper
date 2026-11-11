# Commandes du projet. `make help` pour la liste.

-include .env
export

COMPOSE := docker compose

# Valeurs par défaut si .env est absent (mêmes que docker-compose.yml).
POSTGRES_USER ?= travel
POSTGRES_DB ?= travel

.DEFAULT_GOAL := help
.PHONY: help dev down db-up db-down db-logs db-psql db-reset backend frontend test lint format audit check generate geo migrate-new

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

# Les tests d'intégration travaillent dans des schémas temporaires de la base
# de dev : les données locales ne sont pas touchées.
test: ## Lance les tests du backend (Docker, avec la base) et du frontend (outils locaux)
	$(COMPOSE) run --rm --build backend sh -c 'TEST_DATABASE_URL="$$DATABASE_URL" go test ./...'
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

# Les mêmes vérifications que la CI, à lancer avant d'ouvrir une PR. Le build
# du frontend est le seul à vérifier les types TypeScript.
check: lint test audit ## Lance toutes les vérifications de la CI : lint, tests, failles, types et build
	cd frontend && npm run build

generate: ## Génère le code depuis api/openapi.yaml et les requêtes SQL (outils locaux)
	cd backend && go generate ./... && go tool sqlc generate
	cd frontend && npm run generate

# Les sources Natural Earth (environ 30 Mo) sont téléchargées une seule fois
# dans data/geo/ (non versionné), à la version qui a produit les fichiers
# versionnés de frontend/public/geo/ : la commande redonne exactement les mêmes.
geo: ## Régénère les formes des pays du globe et des cartes (télécharge ~30 Mo la première fois)
	cd frontend && node scripts/download-natural-earth.mjs
	cd frontend && node scripts/build-countries.mjs ../data/geo/ne_110m_admin_0_countries.geojson ../data/geo/ne_50m_admin_0_countries.geojson
	cd frontend && node scripts/build-country-shapes.mjs ../data/geo/ne_10m_admin_0_countries.geojson ../data/geo/ne_10m_admin_0_countries_gbr.geojson

# Les migrations s'appliquent au démarrage du backend : cette cible crée
# seulement le fichier, numéroté à la suite du dernier.
migrate-new: ## Crée une migration vide : make migrate-new name=add_role
	@echo "$(name)" | grep -qE '^[a-z0-9_]+$$' || { echo "Usage : make migrate-new name=<minuscules_chiffres_underscores>"; exit 1; }
	@last=$$(ls backend/migrations | grep -E '^[0-9]+_.*\.sql$$' | sort | tail -n 1 | cut -d_ -f1); \
	file=backend/migrations/$$(printf '%05d' $$(expr $${last:-0} + 1))_$(name).sql; \
	printf -- '-- +goose Up\n\n-- +goose Down\n' > $$file; \
	echo "Créé : $$file"
