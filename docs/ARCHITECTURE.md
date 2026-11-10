# Portopedia architecture

## System shape

Portopedia is a TypeScript monorepo with independently deployable web and API services.

- `apps/web`: Next.js App Router application, responsive presentation layer, SEO metadata, and PWA shell.
- `apps/api`: Express REST API, request security middleware, health endpoints, and Prisma data access.
- PostgreSQL: normalized persistence through Prisma.
- Cloudflare R2: object storage for creator-uploaded assets.
- Google OAuth and email/password: authentication methods.
- Brevo: transactional email delivery.
- Render: web and API hosting.

## Request flow

The browser loads the Next.js application. Browser-side application requests target the versioned API under `/api/v1`. The API validates configuration at startup, applies security headers, origin restrictions, JSON body limits, structured request logging, and rate limiting before routing requests. Prisma is the persistence boundary.

## Data ownership

A user owns one portfolio, sessions, OAuth identities, and uploaded assets. A portfolio owns projects. Project and asset foreign keys enforce relational integrity. Session token material is stored as a hash rather than a raw browser token. Asset storage keys are unique and must be generated server-side.

## Deployment topology

Render hosts the web and API services. PostgreSQL is supplied as a managed database such as Neon. The API receives the database connection string and external provider credentials only through Render environment variables. The web service receives the public API origin at build time.

## Security boundaries

- Secrets are read from environment variables and excluded from source control.
- API responses use generic error messages for unexpected failures.
- Security headers are set by Helmet and the web server.
- Cross-origin requests are restricted to the configured web origin.
- API requests are rate limited.
- Input validation is required at every feature route before database operations.
- Resource authorization must be checked against the authenticated owner, not a client-supplied owner identifier.

## Current implementation boundary

The repository foundation, landing page, API health routes, initial relational schema, and deployment scaffolding are committed. Feature routes for identity, session lifecycle, portfolio editing/publishing, file upload, and administration still require implementation and automated verification before production use. Provider integrations require real credentials and provider-side configuration.
