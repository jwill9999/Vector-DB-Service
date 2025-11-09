# ========================================
# 🧩 PHONY TARGETS
# ========================================
.PHONY: \
	build \
	clean \
	commit \
	dev \
	prod \
	format \
	install \
	lint \
	start \
	test \
	test-unit \
	test-int \
	test-with-docker \
	docker \
	docker-build \
	docker-prod \
	docker-down \
	docker-clean \
	docker-supabase \
	docker-test-down \
	docker-test-clean

# ========================================
# ⚙️ VARIABLES
# ========================================
ENV_FILE ?= .env
PROD_ENV_FILE ?= .env
DOCKER_ENV_FILE ?= .env.docker
TEST_ENV_FILE ?= .env.test
TEST_COMPOSE_PROJECT ?= vectordb_test
TEST_CONTAINER_PREFIX ?= vectordb_test
compose   := docker compose

define run_with_env
	@if [ ! -f $(1) ]; then \
		echo "$(1) not found; please create it from .env.example"; \
		exit 1; \
	fi; \
	echo "Loading environment from $(1)"; \
	export $$(grep -v '^#' $(1) | xargs) && $(2)
endef

# ========================================
# 🧰 CORE TASKS
# ========================================

install:
	npm install

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

format:
	npm run format

commit:
	npm run commit

clean:
	npm run clean

# ========================================
# 🧪 DEVELOPMENT (LOCAL)
# ========================================

dev:
	$(call run_with_env,$(ENV_FILE),npm run build && npm run start)

prod:
	$(call run_with_env,$(PROD_ENV_FILE),npm run build && npm run start)

# ========================================
# 🐳 DOCKER TASKS
# ========================================

docker-build:
	@if [ ! -f $(DOCKER_ENV_FILE) ]; then \
		echo "$(DOCKER_ENV_FILE) not found; please create it from .env.example"; \
		exit 1; \
	fi
	@SERVICE_ENV_FILE=$(DOCKER_ENV_FILE) $(compose) build

docker:
	@if [ ! -f $(DOCKER_ENV_FILE) ]; then \
		echo "$(DOCKER_ENV_FILE) not found; please create it from .env.example"; \
		exit 1; \
	fi
	@SERVICE_ENV_FILE=$(DOCKER_ENV_FILE) $(compose) up --build

# Start only the Supabase service for local integration tests
docker-supabase:
	@if [ ! -f $(DOCKER_ENV_FILE) ]; then \
		echo "$(DOCKER_ENV_FILE) not found; please create it from .env.example"; \
		exit 1; \
	fi
	@SERVICE_ENV_FILE=$(DOCKER_ENV_FILE) $(compose) up supabase

docker-prod:
	@if [ ! -f $(PROD_ENV_FILE) ]; then \
		echo "$(PROD_ENV_FILE) not found; please create it"; \
		exit 1; \
	fi
	@SERVICE_ENV_FILE=$(PROD_ENV_FILE) $(compose) up --build

docker-down:
	@$(compose) down

docker-clean:
	@$(compose) down -v

docker-test-down:
	@if [ ! -f $(DOCKER_ENV_FILE) ]; then \
		echo "$(DOCKER_ENV_FILE) not found; please create it from .env.example"; \
		exit 1; \
	fi
	@COMPOSE_PROJECT_NAME=$(TEST_COMPOSE_PROJECT) CONTAINER_PREFIX=$(TEST_CONTAINER_PREFIX) SERVICE_ENV_FILE=$(DOCKER_ENV_FILE) $(compose) down

docker-test-clean:
	@if [ ! -f $(DOCKER_ENV_FILE) ]; then \
		echo "$(DOCKER_ENV_FILE) not found; please create it from .env.example"; \
		exit 1; \
	fi
	@COMPOSE_PROJECT_NAME=$(TEST_COMPOSE_PROJECT) CONTAINER_PREFIX=$(TEST_CONTAINER_PREFIX) SERVICE_ENV_FILE=$(DOCKER_ENV_FILE) $(compose) down -v

test:
	$(call run_with_env,$(TEST_ENV_FILE),npm run test)

test-unit:
	npm run test:unit

test-int:
	@if [ ! -f $(DOCKER_ENV_FILE) ]; then \
		echo "$(DOCKER_ENV_FILE) not found; please create it from .env.example"; \
		exit 1; \
	fi; \
	set -e; \
	trap "COMPOSE_PROJECT_NAME=$(TEST_COMPOSE_PROJECT) CONTAINER_PREFIX=$(TEST_CONTAINER_PREFIX) SERVICE_ENV_FILE=$(DOCKER_ENV_FILE) $(compose) down" EXIT; \
	COMPOSE_PROJECT_NAME=$(TEST_COMPOSE_PROJECT) CONTAINER_PREFIX=$(TEST_CONTAINER_PREFIX) SERVICE_ENV_FILE=$(DOCKER_ENV_FILE) $(compose) up -d supabase migrate; \
	COMPOSE_PROJECT_NAME=$(TEST_COMPOSE_PROJECT) CONTAINER_PREFIX=$(TEST_CONTAINER_PREFIX) SERVICE_ENV_FILE=$(DOCKER_ENV_FILE) $(compose) wait migrate; \
	export $$(grep -v '^#' $(TEST_ENV_FILE) | xargs); \
	npm run test:integration

test-with-docker:
	$(MAKE) --no-print-directory test-int
