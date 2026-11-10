# Database guide

Portopedia uses PostgreSQL with Prisma ORM.

## Core entities

- `User`: creator identity and credential hash.
- `Session`: hashed session token, expiry, and activity timestamps.
- `OAuthAccount`: external identity mapping for Google OAuth.
- `Portfolio`: the creator's public-facing profile and visibility state.
- `Project`: work entries belonging to a portfolio.
- `Asset`: uploaded media metadata and Cloudflare R2 object key.

Unique constraints protect email, username, session token hashes, provider identities, portfolio ownership, project slugs within a portfolio, and object keys. Foreign keys enforce ownership and deletion behavior.

## Local database

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to a PostgreSQL connection string.
3. Start local PostgreSQL with `docker compose up -d postgres`.
4. Set the local connection string to `postgresql://portopedia:portopedia_local@localhost:5432/portopedia`.
5. Run `npm install`.
6. Run `npm run db:generate`.
7. Run `npm run db:migrate`.

The migration command deploys committed migrations. Schema changes should be made in `schema.prisma`, reviewed, and committed with a corresponding Prisma migration.

## Backup and recovery

For managed PostgreSQL, enable provider-supported automated backups and point-in-time recovery. Before a destructive migration, create a verified backup. Test restoration into a separate database and validate row counts and key relationships before switching application traffic. Keep R2 object retention and database metadata retention aligned; database backups alone do not back up object contents.
