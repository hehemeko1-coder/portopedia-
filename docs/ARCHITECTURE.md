# Portopedia architecture

## System shape

Portopedia is a TypeScript monorepo with independently deployable web and API services.

- `apps/web`: Next.js App Router application, responsive presentation layer, SEO metadata, account flows, creator dashboard, public portfolio pages and PWA shell.
- `apps/api`: Express REST API, authentication, portfolio/project/asset/admin routes, security middleware, health endpoints and Prisma data access.
- PostgreSQL: normalized persistence through Prisma migrations.
- Cloudflare R2: object storage for creator-uploaded assets.
- Google OAuth: OpenID Connect authorization-code flow with PKCE.
- Brevo: transactional email for verification and password recovery.
- Render: web and API hosting.

## Request flow

The browser loads the Next.js application. Browser-side application requests target the versioned API under `/api/v1` and include credentials for the API's HttpOnly session cookie. The API validates configuration at startup, applies security headers, CORS and trusted-origin checks, bounded JSON parsing, structured request logging and rate limiting before routing requests. Prisma is the persistence boundary.

## Data ownership

A user owns one portfolio, sessions, OAuth identities, email tokens and uploaded assets. A portfolio owns projects. Project and asset foreign keys enforce relational integrity. Session and email-token material is stored as a hash rather than raw browser/email tokens. Asset storage keys are generated server-side and are unique.

## Authentication lifecycle

Email/password registration creates a private portfolio and sends a one-time verification link through Brevo. Email verification establishes a session. Login requires a verified email. Password recovery uses a one-time token, changes the Argon2id password hash and revokes all existing sessions. Google sign-in uses OIDC state, nonce and PKCE validation and only accepts verified Google email claims.

## Publishing flow

Creators edit their private portfolio and manage private projects in the authenticated workspace. A project is public only when explicitly published. A public portfolio endpoint returns only a published public portfolio and its published public projects. Portfolio unpublishing removes it from public reads.

## Asset flow

The API checks ownership and project association, issues a short-lived R2 presigned upload URL and stores a pending asset record. After upload, the API checks object size, declared content type and binary file signature before marking the asset ready. Only a ready image attached to the same owned project can be assigned as its cover.

## Deployment topology

Render hosts the web and API services. PostgreSQL is supplied as a managed database such as Neon. The API receives the database connection string and provider credentials only through environment variables. The web service receives the public API origin at build time.

## Security boundaries

- Secrets are read from environment variables and excluded from source control and Docker build contexts.
- Passwords use Argon2id; opaque session tokens and one-time email tokens are hashed at rest.
- Session cookies are HttpOnly, Secure in production and SameSite=Lax.
- Cookie-authenticated mutations validate the browser Origin against the configured web origin.
- Security headers are set by Helmet; CORS is restricted to the configured web origin.
- Authentication endpoints have stricter rate limits than general API routes.
- Input schemas validate request bodies, query parameters and identifiers.
- Private portfolio, project and asset operations verify ownership server-side.
- Public portfolio responses omit internal R2 object keys.

## Implementation boundary

The general creator-portfolio baseline is implemented. Provider credentials, provider-side configuration, production deployment, real-device PWA checks, accessibility review, load testing, backup/restore drills and product-specific requirements from the separate PRD remain deployment/acceptance work. The uploaded file named `portopedia PDR.txt` is itself an engineering prompt rather than the separate product requirements document it references.
