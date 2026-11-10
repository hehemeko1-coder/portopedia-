# API reference

Base path: `/api/v1`

## Conventions

- JSON request and response bodies.
- Versioned REST resources.
- Consistent errors shaped as `{ "error": { "code": "...", "message": "..." } }`.
- Pagination, filtering, sorting, and searching must have bounded inputs.
- Private resource routes must authenticate and authorize ownership before access.
- Sensitive routes must have stricter per-route rate limits than the global limit.

## Available endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/live` | Process liveness |
| GET | `/health/ready` | Database readiness |
| GET | `/api/v1` | API identity and version |

Portfolio, project, identity, upload, and administration endpoints are not exposed until their complete authentication, validation, authorization, and persistence workflows are implemented.
