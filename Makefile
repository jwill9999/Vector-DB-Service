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

test-with-docker:
	@if [ ! -f $(DOCKER_ENV_FILE) ]; then \
		echo "$(DOCKER_ENV_FILE) not found; please create it from .env.example"; \
		exit 1; \
	fi
	@set -e; \
	PHASE_START='\033[1;44;97m[1/3] Launch Supabase + migrate\033[0m'; \
	PHASE_WAIT='\033[1;45;97m[2/3] Await migration completion\033[0m'; \
	PHASE_TEST='\033[1;42;97m[3/3] Run test suite\033[0m'; \
	trap "COMPOSE_PROJECT_NAME=$(TEST_COMPOSE_PROJECT) CONTAINER_PREFIX=$(TEST_CONTAINER_PREFIX) SERVICE_ENV_FILE=$(DOCKER_ENV_FILE) $(compose) down" EXIT; \
	printf '%b\n' "$$PHASE_START"; \
	COMPOSE_PROJECT_NAME=$(TEST_COMPOSE_PROJECT) CONTAINER_PREFIX=$(TEST_CONTAINER_PREFIX) SERVICE_ENV_FILE=$(DOCKER_ENV_FILE) $(compose) up -d supabase migrate; \
	printf '%b\n' "$$PHASE_WAIT"; \
	COMPOSE_PROJECT_NAME=$(TEST_COMPOSE_PROJECT) CONTAINER_PREFIX=$(TEST_CONTAINER_PREFIX) SERVICE_ENV_FILE=$(DOCKER_ENV_FILE) $(compose) wait migrate; \
	printf '%b\n' "$$PHASE_TEST"; \
	$(MAKE) --no-print-directory test
