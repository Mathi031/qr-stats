.PHONY: up down build logs test test-go test-node

up:
	docker compose up --build

down:
	docker compose down -v

build:
	docker compose build

logs:
	docker compose logs -f

test: test-go test-node

test-go:
	cd go-qr-api && go test ./...

test-node:
	cd node-stats-api && npm test
