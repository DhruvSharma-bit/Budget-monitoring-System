# Budget Monitoring System

This repository is organized as:

- `budget_client/` - React + Tailwind frontend
- `backend/` - Express + PostgreSQL backend

## PostgreSQL (Docker)

Start PostgreSQL from the repository root:

```bash
docker compose up -d postgres
```

Default credentials from `docker-compose.yml`:

- Host: `localhost`
- Port: `5432`
- Database: `budget_system`
- User: `postgres`
- Password: `password`

Then use this value in `backend/.env`:

```env
DIRECT_DATABASE_URL="postgresql://postgres:password@localhost:5432/budget_system?schema=public"
```

Stop the container:

```bash
docker compose down
```

## Frontend

```bash
cd budget_client
npm install
npm run dev
```

## Backend

```bash
cd backend
npm install
npm run dev
```
