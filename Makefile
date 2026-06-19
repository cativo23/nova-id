.PHONY: help dev dev-local prod stop stop-prod clean logs test setup-permissions clear-permissions

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

dev: ## Start development (base stack, ports 5173/5174/5175, etc.)
	docker compose up -d

dev-local: ## Start development with local domains (auth.ory.localhost, etc.) and local-proxy on port 80
	docker compose -f docker-compose.yml -f docker-compose.local.yml up -d

prod: ## Start production (standalone compose, Traefik; use start-production.sh for full preflight check)
	docker compose -f docker-compose.production.yml up -d

stop: ## Stop development stack (docker compose down)
	docker compose down

stop-prod: ## Stop production stack
	docker compose -f docker-compose.production.yml down

clean: ## Stop and remove all containers, volumes, and networks (dev stack)
	docker compose down -v

logs: ## Show logs from all services (dev stack)
	docker compose logs -f

logs-service: ## Show logs from a specific service (usage: make logs-service SERVICE=kratos)
	docker compose logs -f $(SERVICE)

test: ## Run comprehensive stack tests
	./scripts/test-stack-comprehensive.sh

test-email: ## Test email sending (verification, recovery, etc.)
	./scripts/test-email-sending.sh

test-email-real: ## Test email sending with a real user
	./scripts/test-email-with-real-user.sh

setup-permissions: ## Setup RBAC permissions (platform_admin / platform_user)
	./scripts/setup-all-permissions.sh

clear-permissions: ## Clear all permissions (for testing/resetting)
	./scripts/clear-all-permissions.sh

setup-hydra-client: ## Setup test OAuth client in Hydra
	./scripts/setup-hydra-test-client.sh

generate-env: ## Generate .env file from template
	./scripts/generate-env.sh

restart: ## Restart all services (dev stack)
	docker compose restart

restart-service: ## Restart a specific service (usage: make restart-service SERVICE=kratos)
	docker compose restart $(SERVICE)

ps: ## Show running services (dev stack)
	docker compose ps

health: ## Check health of all services
	@echo "Checking Kratos..."
	@curl -s http://localhost:4433/health/ready || echo "Kratos: Not ready"
	@echo "Checking Hydra..."
	@curl -s http://localhost:4444/health/ready || echo "Hydra: Not ready"
	@echo "Checking Keto..."
	@curl -s http://localhost:4466/health/ready || echo "Keto: Not ready"
	@echo "Checking Oathkeeper..."
	@curl -s http://localhost:4456/health/alive || echo "Oathkeeper: Not ready"
