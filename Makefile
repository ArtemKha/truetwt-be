# TrueTweet Backend Makefile

.PHONY: help install dev build start test lint format clean docker-dev docker-prod

# Default target
help:
	@echo "TrueTweet Backend - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  install     Install dependencies"
	@echo "  dev         Start development server"
	@echo "  build       Build for production"
	@echo "  start       Start production server"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  test        Run tests"
	@echo "  test-watch  Run tests in watch mode"
	@echo "  test-cov    Run tests with coverage"
	@echo "  lint        Check code quality"
	@echo "  lint-fix    Fix linting issues"
	@echo "  format      Format code"
	@echo ""
	@echo "Docker:"
	@echo "  docker-dev  Start with Docker (development)"
	@echo "  docker-prod Start with Docker (production)"
	@echo "  docker-stop Stop Docker containers"
	@echo "  docker-clean Clean Docker resources"
	@echo ""
	@echo "Utilities:"
	@echo "  clean       Clean build artifacts"
	@echo "  logs        View application logs"

# Development commands
install:
	npm ci

dev:
	npm run dev

build:
	npm run build

start:
	npm start

# Testing and quality
test:
	npm test

test-watch:
	npm run test:watch

test-cov:
	npm run test:coverage

lint:
	npm run lint

lint-fix:
	npm run lint:fix

format:
	npm run format

# Docker commands
docker-dev:
	docker-compose up --build

docker-prod:
	docker-compose -f docker-compose.prod.yml up --build -d

docker-stop:
	docker-compose down
	docker-compose -f docker-compose.prod.yml down

docker-clean:
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.prod.yml down -v --remove-orphans
	docker system prune -f

# Utility commands
clean:
	rm -rf dist/
	rm -rf coverage/
	rm -rf node_modules/.cache/
	rm -rf logs/*.log

logs:
	@if [ -d "logs" ]; then \
		echo "Recent log entries:"; \
		tail -n 50 logs/combined.log; \
	else \
		echo "No logs directory found. Run the application first."; \
	fi

# Setup environment for new developers
setup: install
	@echo "Setting up development environment..."
	@if [ ! -f .env ]; then \
		cp env.example .env; \
		echo "Created .env file from env.example"; \
		echo "Please update .env with your configuration"; \
	fi
	@mkdir -p logs data
	@echo "Created logs and data directories"
	@echo "Setup complete! Run 'make dev' to start development server"

# Database operations
db-reset:
	@echo "Resetting database..."
	@rm -f data/database.sqlite
	@echo "Database reset complete"

# Health check
health:
	@echo "Checking application health..."
	@curl -f http://localhost:3000/api/health || echo "Application is not running"

# Generate API documentation
docs:
	npm run docs

# Production deployment helpers
deploy-check:
	@echo "Running pre-deployment checks..."
	@npm run lint
	@npm run test
	@npm run build
	@echo "All checks passed!"

# Development helpers
deps-check:
	npm audit
	npm outdated

deps-update:
	npm update
	npm audit fix
