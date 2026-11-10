# Requirements traceability

This matrix combines the Portopedia Master AI Engineering Prompt with the supplied Portopedia PRD. The PRD defines product scope; the engineering prompt defines implementation standards and deliverables. Requirements are not considered complete merely because their data model or interface shell exists.

## Product requirements

| Requirement | Implementation evidence | Status |
| --- | --- | --- |
| Global creator portfolio platform | Product foundation and creator portfolio data model | In progress |
| Responsive, accessible, SEO-friendly web experience | Next.js App Router, responsive landing page, metadata and semantic structure | Foundation complete; full product accessibility audit pending |
| Playful brutalist visual direction | Portopedia design system and landing page | Foundation complete |
| PWA support | Web manifest, service worker and registration | Foundation complete; device install/offline QA pending |
| Email/password authentication | Argon2id password hashing, registration, login, logout and server-side sessions | Implemented; integration tests pending |
| Google OAuth | OpenID Connect authorization-code flow with PKCE, state and nonce validation | Implemented; provider credentials and callback configuration required |
| Portfolio creation and editing | Default portfolio on account creation; owner-scoped read and update routes | Implemented; integration tests pending |
| Project publishing and visibility | Owner-scoped CRUD, search, pagination, private/public state and published public listing | Implemented; integration tests pending |
| Creator media uploads | R2 presigned upload, ownership validation, object metadata verification and deletion | Implemented; R2 credentials and public domain required |
| Administration dashboard | Administrator role in user model | Not implemented |
| Brevo transactional email | Environment contract | Not implemented |

## Engineering requirements

| Requirement | Implementation evidence | Status |
| --- | --- | --- |
| Next.js, React, TypeScript and Tailwind CSS | Web workspace | Implemented |
| Node.js, Express and TypeScript | API workspace | Implemented |
| PostgreSQL and Prisma | Schema and initial migration | Foundation implemented |
| Cloudflare R2 | Environment contract | Not implemented |
| Render hosting | Blueprint for web and API services | Configured; external service deployment pending |
| Versioned REST API | `/api/v1` route base | Foundation implemented |
| Validation, rate limiting, logging and error handling | Zod environment validation, global rate limit, Pino request logs and JSON error handling | Foundation implemented; per-feature validation pending |
| Authentication and authorization middleware | Hashed opaque sessions, cookie middleware and owner-scoped resource queries | Implemented; security review pending |
| Secure cookies and password hashing | Security design documented | Not implemented |
| Automated tests | API liveness and not-found tests | Foundation tests added; feature coverage pending |
| Docker support | Local PostgreSQL Docker Compose service | Foundation implemented; application container images pending |
| Documentation | Architecture, database, API, security, deployment, development and this matrix | Foundation implemented |
| CI | GitHub Actions workflow | Added; passing run required |
| No secrets in source control | Environment template and ignore rules | Implemented |

## Completion policy

A requirement moves to complete only after its end-to-end implementation exists, relevant automated tests pass, and deployment behavior has been verified. Environment placeholders in `.env.example` are configuration keys, not fake credentials. Production provider credentials must be supplied by the deployment owner.
