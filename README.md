# Portopedia

Portopedia is a creator portfolio platform implemented as a TypeScript monorepo.

## Source-document scope

The uploaded file named `portopedia PDR.txt` identifies itself as a Master AI Engineering Prompt and refers to a separate Product Requirements Document. The other uploaded file is also an engineering prompt. Neither file contains a distinct product specification with complete user journeys, page requirements, role definitions, or acceptance criteria. This repository therefore implements the clearly supported creator-portfolio baseline and engineering requirements; it does not invent additional product scope.

## Current product baseline

- Creator registration, verified email, Google OAuth and secure account sessions
- Creator profile editing and public/private portfolio publishing
- Project creation, editing, deletion, visibility, search and pagination
- Direct-to-R2 project cover uploads with file-signature verification
- Public portfolio pages with project cover images
- Administrator metrics and creator directory
- Responsive landing, authentication and creator workspace experiences
- PWA shell, dark/light theme and keyboard-focus support

## Technology

- Web: Next.js, React, TypeScript, Tailwind CSS, PWA
- API: Node.js, Express, TypeScript, versioned REST
- Data: PostgreSQL and Prisma
- Object storage: Cloudflare R2
- Authentication: Argon2id email/password and Google OpenID Connect
- Email delivery: Brevo
- Hosting: Render

## Repository structure

```
apps/
  api/        Express API, routes, Prisma schema, migrations and tests
  web/        Next.js App Router, account pages, dashboard and public portfolio
docs/         Architecture, API, database, security and operations
docker-compose.yml
render.yaml
.env.example
```

## Local development

1. Install Node.js 20.11+ and npm 10+.
2. Copy `.env.example` to `.env`.
3. Start local PostgreSQL: `docker compose up -d postgres`.
4. Set `DATABASE_URL=postgresql://portopedia:portopedia_local@localhost:5432/portopedia` in `.env`.
5. Configure Brevo credentials and a verified sender to enable email/password registration.
6. Install dependencies: `npm install`.
7. Generate Prisma Client: `npm run db:generate`.
8. Apply migrations: `npm run db:migrate`.
9. Start web and API: `npm run dev`.

The web app defaults to http://localhost:3000 and the API to http://localhost:4000.

## Docker

Copy `.env.example` to `.env`, configure the required database and provider variables, then run:

```bash
docker compose up --build
```

The local web app is served on port 3000 and the API on port 4000.

## First administrator

After registering and verifying the account that should administer the platform, set `BOOTSTRAP_ADMIN_EMAIL` to that account's email in the API environment and run `npm run db:seed --workspace=@portopedia/api` once. The seed only promotes an existing verified account.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The CI workflow provisions PostgreSQL, applies migrations, type-checks both workspaces, runs API tests, lints the web app and builds both applications.

## External setup required before deployment

- Neon or another PostgreSQL connection string
- Brevo API key and verified sender email
- Google OAuth client ID, secret and exact callback URL
- Cloudflare R2 bucket, scoped credentials, bucket CORS and public asset domain
- Render web/API origins and environment variables
- A verified creator account to promote to administrator

Do not commit provider credentials or production secrets.
