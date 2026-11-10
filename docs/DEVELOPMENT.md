# Developer guide

## Requirements

- Node.js 20.11 or newer
- npm 10 or newer
- Docker Desktop or another Docker-compatible runtime
- PostgreSQL 16 for local development

## Setup

1. Clone the repository.
2. Copy `.env.example` to `.env` and configure local values.
3. Run `docker compose up -d postgres`.
4. Run `npm install`.
5. Generate Prisma Client with `npm run db:generate`.
6. Apply migrations with `npm run db:migrate`.
7. Start both applications with `npm run dev`.

The web application runs on port 3000 and the API on port 4000 by default.

## Quality checks

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Run the checks before opening a pull request. Do not mark a change verified unless the corresponding command completed successfully in the target environment.
