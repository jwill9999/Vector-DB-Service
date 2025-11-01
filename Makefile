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
	docker \
	docker-build \
	docker-prod \
	docker-down \
	docker-clean \
	docker-supabase

# ========================================
# ⚙️ VARIABLES
# ========================================
ENV_FILE ?= .env
PROD_ENV_FILE ?= .env
DOCKER_ENV_FILE ?= .env.docker
TEST_ENV_FILE ?= .env.test
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

test:
	$(call run_with_env,$(TEST_ENV_FILE),npm run test)
