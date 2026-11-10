# Security model

## Authentication and sessions

Passwords are hashed with Argon2id. Browser sessions use cryptographically random opaque tokens; only SHA-256 token hashes are stored in PostgreSQL. Session cookies are HttpOnly, SameSite=Lax, scoped to the API path and Secure in production. Session expiry is bounded by configuration. Logout and password reset revoke server-side sessions.

Email verification and password reset use random one-time tokens whose hashes are stored in the database. Tokens have expiry timestamps and are consumed atomically so the same token cannot be replayed. Login requires a verified email. Google sign-in validates OIDC state, nonce, PKCE and the verified email claim.

## Authorization and CSRF

Every private portfolio, project and asset operation verifies that the authenticated user owns the resource. Administrator endpoints additionally require the ADMIN role. The initial administrator is promoted only by a controlled seed command targeting an existing verified email.

Cookie-authenticated mutations reject a mismatched Origin header. SameSite cookies and strict CORS are additional browser protections; CORS alone is not treated as CSRF protection. Never trust owner IDs supplied in request bodies or query parameters.

## Input and output

Validate request parameters, query strings, headers and bodies with explicit schemas. Enforce content type, body length and pagination bounds. External profile links are restricted to HTTP and HTTPS. User-provided biography, title and project text are rendered as text, not trusted HTML. Do not render untrusted HTML directly.

## Uploads

Upload authorization precedes issuing short-lived R2 upload permissions. The API validates allowed MIME types, size and project ownership. After upload it checks object metadata and file signatures before marking an asset ready. Storage keys are random and generated server-side; user filenames are display metadata only. Project cover assets must belong to the same creator and project.

## Operations

Never commit secrets. Rotate provider credentials if exposed. Production error responses are generic while sanitized diagnostics are recorded in structured logs. Authentication and upload-signing endpoints have stricter rate limits. Configure provider-side backups, alerting and least-privilege service credentials. Verify database restoration and R2 object recovery procedures before launch.
