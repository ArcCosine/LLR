# Backend Repository Specification

## Goal

Create a new backend-only repository for the RSS Reader.

This repository must run on Cloudflare Workers and provide an API layer for fetching external RSS/Atom feeds on behalf of the frontend.

The frontend will be developed separately as a static application, likely with Vite. The backend must therefore be designed as an independent HTTP API service.

## Why This Repository Exists

The current frontend cannot reliably fetch external RSS feeds directly from the browser because of:

- CORS restrictions
- mixed content restrictions for `http://` feeds
- inconsistent charset handling across old RSS sources

This backend repository exists to solve those issues by proxying feed fetches through Cloudflare Workers.

## High-Level Requirements

Build a Cloudflare Workers application with the following characteristics:

- deployable on Cloudflare Workers
- no dependency on Next.js
- usable from a separately hosted frontend
- focused only on feed retrieval, normalization, and cache control
- safe for public internet exposure

## Core Responsibilities

The backend must:

- fetch RSS / Atom feeds from arbitrary external URLs
- support both `http://` and `https://` upstream feeds if Workers allows them
- decode non-UTF-8 responses when possible
- normalize the returned response to UTF-8
- return the original XML text to the frontend
- add CORS headers so the separate frontend can call it
- cache upstream responses aggressively enough to reduce Workers usage

## Non-Goals

The backend should not:

- render HTML
- store user accounts
- manage authentication in the initial version
- persist user OPML files in the initial version
- parse RSS into application JSON in the first step unless there is a strong implementation reason

The first version should stay as small and stable as possible.

## Expected API

### 1. Health Check

Implement:

- `GET /healthz`

Expected response:

- HTTP `200`
- plain text or JSON indicating the service is healthy

### 2. RSS Proxy Endpoint

Implement:

- `GET /api/rss?url=<encoded-feed-url>`

Behavior:

- validate that `url` exists
- reject malformed URLs
- fetch the upstream RSS or Atom feed
- read the upstream response as bytes
- detect charset from `Content-Type` header if present
- if charset is missing, inspect the XML declaration for `encoding="..."`
- decode the payload with the detected charset if possible
- normalize the final output to UTF-8
- if XML declaration contains another encoding, rewrite it to `utf-8`
- return the XML as:
  - `Content-Type: application/xml; charset=utf-8`

### 3. CORS

The backend must support cross-origin access from the separately deployed frontend.

At minimum:

- support `GET`
- respond to `OPTIONS`
- include:
  - `Access-Control-Allow-Origin`
  - `Access-Control-Allow-Methods`
  - `Access-Control-Allow-Headers`

Initial implementation may use `Access-Control-Allow-Origin: *`.

## Upstream Fetch and Caching Strategy

Use Cloudflare Workers caching so repeated requests for the same feed do not always hit the upstream site.

Requirements:

- use `caches.default` or an equivalent Cloudflare-native caching approach
- cache by full feed URL
- default TTL target: 5 to 30 minutes
- allow stale caching behavior if practical
- avoid unnecessary repeated upstream fetches

The design goal is to keep the backend usable on the Cloudflare free plan for small to medium public usage.

## Error Handling

Define clear HTTP responses.

Suggested behavior:

- missing `url`: `400`
- invalid URL: `400`
- upstream fetch failure: `502`
- upstream non-OK response: `502`
- unexpected internal error: `500`

Return JSON errors in the form:

```json
{ "error": "..." }
```

## Security Requirements

Because this is a public proxy-like endpoint, add guardrails.

The initial version should include:

- URL validation with `new URL(...)`
- restriction to `http:` and `https:` only
- rejection of localhost and obvious private/internal addresses if feasible
- reasonable timeout behavior for upstream fetches
- no support for arbitrary request headers from clients
- no cookie forwarding

If SSRF protection cannot be fully guaranteed in the first version, document the limitations clearly in the README.

## Charset Handling

This is important.

Many older RSS feeds are not UTF-8. Recreate the behavior of the current implementation:

- inspect `Content-Type` header for charset
- if absent, inspect the XML declaration
- decode using the detected charset
- fallback to UTF-8 if decoding is not possible

If Workers cannot support arbitrary legacy encodings directly, evaluate practical alternatives and document them.

At minimum, the repository should explicitly discuss:

- what encodings are supported in Workers runtime
- what fallback behavior is used
- what limitations remain for old Japanese feeds and similar sources

## Repository Structure

Use a simple structure. Example:

```text
/
  src/
    index.ts
    cors.ts
    cache.ts
    rss.ts
    charset.ts
    security.ts
  test/
  wrangler.jsonc
  package.json
  tsconfig.json
  README.md
```

Exact structure can vary, but keep modules focused and small.

## Tech Stack

Preferred stack:

- TypeScript
- Cloudflare Workers
- Wrangler
- minimal dependencies

Avoid large frameworks unless there is a concrete need.

If a tiny router is helpful, it is acceptable, but plain Workers APIs are also fine.

## Development Experience

The repository should support:

- local development with Wrangler
- deploy to Cloudflare Workers
- linting
- type checking
- at least a small test surface for core logic

Suggested scripts:

- `dev`
- `deploy`
- `check`
- `test`

## Tests

Include tests for at least:

- URL validation
- charset detection logic
- XML declaration rewrite to UTF-8
- CORS headers
- error response behavior

If integration tests are added, include at least one mocked upstream RSS response.

Do not rely only on live internet feeds for tests.

## README Requirements

The new repository README should explain:

- what the service does
- why the proxy is necessary
- how to run it locally
- how to deploy it to Cloudflare Workers
- available endpoints
- caching strategy
- known limitations
- expected relationship with the frontend repository

## Frontend Integration Contract

Assume the separate frontend will call this backend like:

```ts
fetch(`${BACKEND_BASE_URL}/api/rss?url=${encodeURIComponent(feedUrl)}`)
```

The backend should therefore:

- return raw XML text
- be CORS-accessible
- be stable for browser clients

Do not assume any server-side frontend.

## Future Extensions

Design the code so these can be added later:

- feed-to-JSON conversion endpoint
- per-domain cache policy
- rate limiting
- allowlist / denylist support
- optional API key for private deployments
- OPML upload and preprocessing
- feed sanitization pipeline

These are not required in the first implementation.

## Deliverable Expectation

Please create a new repository that includes:

- a working Cloudflare Workers application
- the endpoints described above
- UTF-8 normalization behavior
- CORS support
- caching
- basic tests
- README with setup and deployment instructions

Keep the first version small, direct, and production-aware.
