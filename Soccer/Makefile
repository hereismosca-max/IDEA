PYTHON ?= python3
VENV ?= .venv
PIP := $(VENV)/bin/pip
PY := $(VENV)/bin/python

.PHONY: venv install init-db reset-db sync-recent train rebuild-2022 api ui scheduler

venv:
	$(PYTHON) -m venv $(VENV)

install: venv
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

init-db:
	$(PY) -m soccer_predictor.cli init-db

reset-db:
	$(PY) -m soccer_predictor.cli reset-db

sync-recent:
	$(PY) -m soccer_predictor.cli sync-recent --days-back 7 --days-forward 2 --no-train

train:
	$(PY) -m soccer_predictor.cli train

rebuild-2022:
	$(PY) -m soccer_predictor.cli rebuild-from-date --start 2022-01-01 --workers 8

api:
	$(PY) -m uvicorn soccer_predictor.api:app --reload --host 127.0.0.1 --port 8000

ui:
	$(VENV)/bin/streamlit run ui/streamlit_app.py

scheduler:
	$(PY) -m soccer_predictor.scheduler
