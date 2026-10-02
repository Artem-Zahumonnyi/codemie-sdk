.PHONY: install test build publish

install:
	poetry install

test:
	poetry run pytest tests/

ruff:
	poetry run ruff check --fix
	poetry run ruff check
	poetry run ruff format

ruff-format:
	poetry run ruff format

ruff-fix:
	poetry run ruff check --fix

verify: ruff tests

build:
	poetry build

publish:
	poetry publish
