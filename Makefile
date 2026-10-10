# Commandes du projet. `make help` pour la liste.

-include .env
export

COMPOSE := docker compose

.DEFAULT_GOAL := help
.PHONY: help dev db-up db-down db-logs db-psql db-reset backend frontend test lint generate migrate

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev: db-up ## Lance l'environnement de développement (base seule pour l'instant)
	@echo "Base prête sur le port $${POSTGRES_PORT:-5432}. Backend et frontend : à venir (tickets 3 et 4)."

db-up: ## Démarre PostgreSQL + PostGIS et attend qu'il soit prêt
	$(COMPOSE) up -d --wait db

db-down: ## Arrête PostgreSQL (les données sont conservées)
	$(COMPOSE) down

db-logs: ## Affiche les logs de PostgreSQL
	$(COMPOSE) logs -f db

db-psql: ## Ouvre un terminal SQL dans la base
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-travel} -d $${POSTGRES_DB:-travel}

db-reset: ## Supprime et recrée la base (perte des données locales)
	$(COMPOSE) down -v
	$(COMPOSE) up -d --wait db

backend: ## Lance le backend Go (pas encore configuré)
	@echo "Pas encore configuré : à venir avec le squelette backend."

frontend: ## Lance le frontend Vite (pas encore configuré)
	@echo "Pas encore configuré : à venir avec le squelette frontend."

test: ## Lance tous les tests (pas encore configuré)
	@echo "Pas encore configuré : à venir avec le ticket qualité et pipeline."

lint: ## Lance le lint et le formatage (pas encore configuré)
	@echo "Pas encore configuré : à venir avec le ticket qualité et pipeline."

generate: ## Génère le code depuis OpenAPI et sqlc (pas encore configuré)
	@echo "Pas encore configuré : à venir avec le ticket contrat d'API."

migrate: ## Applique les migrations (pas encore configuré)
	@echo "Pas encore configuré : à venir avec le premier ticket qui crée une table."
