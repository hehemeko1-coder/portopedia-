# Render deployment

The repository includes a Render Blueprint in `render.yaml` for separate web and API services.

## Required external services

- PostgreSQL database (Neon or another managed PostgreSQL provider)
- Cloudflare R2 bucket and scoped access credentials
- Google OAuth client and authorized callback URL
- Brevo sender identity and API key

## Cloudflare R2 bucket configuration

Create an R2 bucket and an API token scoped to that bucket with object read/write/delete permissions. Set the four R2 credentials in the API service. Set `R2_PUBLIC_BASE_URL` to the custom public domain attached to the bucket if public portfolio images should render.

Configure bucket CORS to allow the deployed web origin to perform `PUT` uploads with the `Content-Type` request header. Allow `PUT` and `GET` from that exact origin; avoid wildcard origins when credentials or private assets are involved. The browser uploads directly to a short-lived signed URL, and the API verifies object size, declared MIME type and file signature before accepting it.

## Google OAuth configuration

Create a Google OAuth web client. Add the exact API callback URL from `GOOGLE_CALLBACK_URL` to the authorized redirect URIs. Configure the deployed web origin in the authorized JavaScript origins if required by the Google Console configuration. Do not place the client secret in the web environment.

## Brevo configuration

Verify the sender domain or sender email in Brevo. Set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` and optionally `BREVO_SENDER_NAME` on the API service. Email/password registration is intentionally unavailable until transactional email is configured.

## Deploy

1. Push the repository to GitHub.
2. Create or connect a Render workspace.
3. Create a Render Blueprint from this repository and review the planned services.
4. Provision the managed PostgreSQL database.
5. Set `DATABASE_URL` on the API service using the provider's direct/unpooled connection string. This repository uses the same `DATABASE_URL` for Prisma Client and migration deployment.
6. Set `WEB_ORIGIN` on the API service to the deployed web origin.
7. Set `NEXT_PUBLIC_API_URL` on the web service to the deployed API origin.
8. Add Google OAuth, R2 and Brevo environment variables.
9. Deploy the API and web services.
10. Verify `/health/live` and `/health/ready`, then complete registration, verification, sign-in, upload and publishing smoke tests before enabling public use.

## First administrator

Register and verify the intended administrator account. Set `BOOTSTRAP_ADMIN_EMAIL` to that exact verified address on the API service, then run `npm run db:seed --workspace=@portopedia/api` once from the deployed service shell or a trusted environment with the production database connection. Remove the bootstrap variable after promotion.

## Environment variables

See the root `.env.example`. Production values must be entered in Render's environment settings, never committed to Git.

## Rollback and recovery

Keep the previous successful Render deployment available. For a failed release, redeploy the previous version, inspect sanitized logs, and restore the database only if a migration caused irreversible data damage. Prefer backward-compatible expand/migrate/contract schema changes. Enable managed PostgreSQL backups and point-in-time recovery; separately configure R2 retention/versioning or backup because database backups do not contain object bytes.
