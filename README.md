# Portopedia

Portopedia is a creator portfolio platform being built from the supplied Product Requirements Document and Master AI Engineering Prompt.

## Product direction

The source documents establish a global creator portfolio platform with a responsive, accessible, SEO-friendly, installable experience and a playful brutalist visual direction. The required platform architecture includes creator identity, portfolio and project publishing, media storage, authentication, administration, and secure ownership-aware permissions.

## Technology

- Web: Next.js, React, TypeScript, Tailwind CSS, PWA
- API: Node.js, Express, TypeScript, versioned REST
- Data: PostgreSQL and Prisma
- Object storage: Cloudflare R2
- Authentication: email/password and Google OAuth
- Email delivery: Brevo
- Hosting: Render

## Repository structure

```
apps/
  api/        Express API, Prisma schema and migrations
  web/        Next.js App Router application and PWA shell
docs/         Architecture, API, database, security and operations
docker-compose.yml
render.yaml
.env.example
```

## Local development

1. Install Node.js 20.11+ and npm 10+.
2. Copy `.env.example` to `.env`.
3. Start PostgreSQL: `docker compose up -d postgres`.
4. Set `DATABASE_URL=postgresql://portopedia:portopedia_local@localhost:5432/portopedia` in `.env`.
5. Install dependencies: `npm install`.
6. Generate Prisma Client: `npm run db:generate`.
7. Apply migrations: `npm run db:migrate`.
8. Start web and API: `npm run dev`.\n\nTo run the complete containerized stack instead, copy `.env.example` to `.env`, set the required database and provider variables, then run `docker compose up --build`. The local web app is served on port 3000 and the API on port 4000.

The web app defaults to http://localhost:3000 and the API to http://localhost:4000.\n\n## First administrator\n\nAfter registering and verifying the account that should administer the platform, set `BOOTSTRAP_ADMIN_EMAIL` to that account's email in the API environment and run `npm run db:seed --workspace=@portopedia/api` once. The seed only promotes an existing verified account; it cannot create an administrator from an arbitrary email address.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Implementation status

The first implementation increment establishes the monorepo, public landing experience, PWA shell, API runtime and health checks, initial PostgreSQL schema and migration, Render blueprint, local PostgreSQL service, and engineering documentation.

Authentication, Google OAuth, portfolio management, project publishing, R2 upload workflows, Brevo delivery, administration, and end-to-end feature tests must be completed and verified before production use. External services require credentials supplied through environment variables. No production credentials belong in Git.
