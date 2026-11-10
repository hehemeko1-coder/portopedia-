# Render deployment

The repository includes a Render Blueprint in `render.yaml` for separate web and API services.

## Required external services

- PostgreSQL database (Neon or another managed PostgreSQL provider)
- Cloudflare R2 bucket and scoped access credentials
- Google OAuth client and authorized callback URL
- Brevo sender identity and API key

## Deploy

1. Push the repository to GitHub.
2. Create or connect a Render workspace.
3. Create a Render Blueprint from this repository and review the planned services.
4. Provision the managed PostgreSQL database.
5. Set `DATABASE_URL` on the API service using the provider's pooled or direct connection string as appropriate for migrations.
6. Set `WEB_ORIGIN` on the API service to the deployed web origin.
7. Set `NEXT_PUBLIC_API_URL` on the web service to the deployed API origin.
8. Add authentication, R2, and Brevo environment variables when their corresponding features are configured.
9. Deploy the API and web services.
10. Verify `/health/live` and `/health/ready`, then complete authentication, upload, and publishing smoke tests before enabling public use.

## Environment variables

See the root `.env.example`. Production values must be entered in Render's environment settings, never committed to Git.

## Rollback

Keep the previous successful Render deployment available. For a failed release, redeploy the previous version, inspect sanitized logs, and restore the database only if a migration caused irreversible data damage. Prefer backward-compatible expand/migrate/contract schema changes.
