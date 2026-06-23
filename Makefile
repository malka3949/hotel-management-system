.PHONY: dev stop migrate seed logs ps clean

dev:
	docker compose up -d
	@echo "✓ Services started"
	@echo "  Backend:  http://localhost:3001/api/health"
	@echo "  Frontend: http://localhost:3000"

stop:
	docker compose down

migrate:
	cd backend && npx prisma migrate dev

migrate-deploy:
	cd backend && npx prisma migrate deploy

seed:
	cd backend && npm run prisma:seed

studio:
	cd backend && npx prisma studio

logs:
	docker compose logs -f backend

ps:
	docker compose ps

clean:
	docker compose down -v
	@echo "⚠ Volumes removed — database wiped"

install:
	cd backend && npm install
	cd frontend && npm install

typecheck:
	cd backend && npm run typecheck
	cd frontend && npx tsc --noEmit

lint:
	cd backend && npm run lint
	cd frontend && npm run lint
