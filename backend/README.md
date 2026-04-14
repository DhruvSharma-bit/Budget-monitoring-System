# College Budget Monitoring Backend

## 1. Setup

1. Start PostgreSQL (from repository root):

```bash
docker compose up -d postgres
```

2. Copy `.env.example` to `.env`
3. Set PostgreSQL URL for your `budget_system` database:

```env
DIRECT_DATABASE_URL="postgresql://postgres:your_password@localhost:5432/budget_system?schema=public"
```

If using the provided Docker setup, the default password is `password`.

4. Install dependencies:

```bash
npm install
```

5. Start backend:

```bash
npm run dev
```

Base API URL: `http://localhost:4000/api`

To stop PostgreSQL later:

```bash
docker compose down
```

## 2. Manual Tables Expected

This backend expects these tables in `public` schema:

- `users`
- `events`
- `funding_sources`
- `categories`

It auto-detects common column variants (for example `event_id` vs `id`, `event` vs `event_id`).

## 3. Auth

- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token required)

Login payload supports:

- `username` + `password`
- `email` + `password` (email field is treated as username)

## 4. Event Endpoints

Read:

- `GET /api/events`
- `GET /api/events/:eventId`

Admin-only write:

- `POST /api/events`
- `PATCH /api/events/:eventId`
- `POST /api/events/:eventId/funding-sources`
- `PATCH /api/events/:eventId/funding-sources/:sourceId`
- `DELETE /api/events/:eventId/funding-sources/:sourceId`
- `POST /api/events/:eventId/categories`
- `PATCH /api/events/:eventId/categories/:categoryId`
- `DELETE /api/events/:eventId/categories/:categoryId`
