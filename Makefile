PYTHON := .venv/bin/python
PIP    := .venv/bin/pip
NPM    := npm
FRONTEND := frontend

.PHONY: start stop install install-py install-js install-hooks build-frontend dev help

## start: launch the desktop app (builds frontend if dist/ is missing)
start:
	@if [ ! -d $(FRONTEND)/dist ]; then $(MAKE) build-frontend; fi
	$(PYTHON) main.py

## stop: kill the running desktop app
stop:
	@pkill -f "python main.py" 2>/dev/null && echo "App encerrado." || echo "Nenhum processo encontrado."

## build: force-rebuild frontend and launch
build: build-frontend start

## install: set up all dependencies (Python venv + Node modules)
install: install-py install-js

install-hooks:
	git config core.hooksPath .githooks

install-py:
	@if [ ! -f $(PYTHON) ]; then python3 -m venv .venv; fi
	$(PIP) install -e ".[dev]" 2>/dev/null || $(PIP) install -e .

install-js:
	cd $(FRONTEND) && $(NPM) install

## build-frontend: compile React app into frontend/dist/
build-frontend:
	cd $(FRONTEND) && $(NPM) run build

## dev: run backend + frontend dev server side by side (no webview)
dev:
	@trap 'kill 0' SIGINT; \
	$(PYTHON) -m uvicorn backend.app:app --reload --port 8000 & \
	cd $(FRONTEND) && $(NPM) run dev; \
	wait

help:
	@grep -E '^## ' Makefile | sed 's/## /  /'
