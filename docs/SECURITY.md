# Security model

## Authentication and sessions

The data model supports password credentials, Google OAuth identities, and opaque server-side sessions. Passwords must be hashed with a modern password hashing function such as Argon2id. Browser sessions must use cryptographically random tokens, store only token hashes, and be delivered in Secure, HttpOnly, SameSite cookies over HTTPS. Rotate session identifiers after authentication and privilege changes. Revoke sessions on logout, password reset, and account security events.

## Authorization

Every private portfolio, project, and asset operation must verify that the authenticated user owns the resource. Never trust owner IDs supplied in request bodies or query parameters. Public read access must require both portfolio and project visibility to be public and published.

## Input and output

Validate request parameters, query strings, headers, and bodies with explicit schemas. Enforce content type, length, and pagination bounds. Escape or sanitize rich text according to its rendering context. Do not render untrusted HTML directly.

## Uploads

Upload authorization must precede issuing short-lived R2 upload permissions. Validate allowed MIME types, extension, byte size, and ownership. Verify uploaded object metadata after transfer before marking an asset ready. Use random object keys; do not use user-provided filenames as storage paths.

## Operations

Never commit secrets. Rotate provider credentials if exposed. Keep production error responses generic while recording sanitized diagnostic details in structured logs. Apply rate limits to authentication, upload-signing, and public endpoints. Configure provider-side backups, alerting, and least-privilege service credentials.
