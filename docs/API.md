# API reference

Base path: `/api/v1`

## Conventions

- JSON request and response bodies.
- Versioned REST resources.
- Consistent errors shaped as `{ "error": { "code": "...", "message": "..." } }`.
- Pagination, filtering, sorting and searching use bounded inputs.
- Private resource routes authenticate and authorize ownership before access.
- Cookie-authenticated mutations validate the configured web Origin.
- Sensitive routes have stricter per-route rate limits than the global limit.

## Health and identity

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/live` | Process liveness |
| GET | `/health/ready` | Database readiness |
| GET | `/api/v1` | API identity and version |

## Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Create account and private portfolio; send verification email |
| POST | `/auth/verify-email` | Consume a one-time email verification token and establish session |
| POST | `/auth/resend-verification` | Resend verification instructions without revealing account existence |
| POST | `/auth/login` | Start a session for a verified account |
| GET | `/auth/me` | Read current authenticated user |
| POST | `/auth/logout` | Revoke current session |
| GET | `/auth/google` | Start Google OpenID Connect sign-in |
| GET | `/auth/google/callback` | Complete Google sign-in |
| POST | `/auth/password-reset/request` | Request password reset instructions |
| POST | `/auth/password-reset/confirm` | Consume reset token, update password and revoke sessions |

## Portfolios and projects

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/portfolios/me` | Read the authenticated creator's portfolio and projects |
| PATCH | `/portfolios/me` | Update owned portfolio details |
| POST | `/portfolios/publish` | Publish the authenticated portfolio |
| POST | `/portfolios/unpublish` | Make the authenticated portfolio private |
| GET | `/portfolios/:username` | Read a public published portfolio and public published projects |
| GET | `/projects` | Search, sort and paginate owned projects |
| POST | `/projects` | Create an owned project |
| PATCH | `/projects/:id` | Update an owned project, visibility or verified cover asset |
| DELETE | `/projects/:id` | Delete an owned project |

## Assets and administration

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/assets/presign` | Create pending asset and issue short-lived R2 upload URL |
| POST | `/assets/:id/complete` | Verify object metadata and file signature |
| GET | `/assets` | List authenticated creator's assets |
| DELETE | `/assets/:id` | Delete an owned object and its metadata |
| GET | `/admin/overview` | Administrator platform metrics |
| GET | `/admin/users` | Search and paginate creator accounts (administrator only) |

All private routes require the API session cookie. Public portfolio reads return only public, published records.
