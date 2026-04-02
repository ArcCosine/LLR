# LLR Reader

Vite + React based RSS reader frontend.

## Development

```bash
bun install
bun run dev
```

The app expects the Cloudflare Workers backend described in `document/backend.md`.
By default it calls:

```text
https://llr-cf-workers.arc-6e4.workers.dev/api/rss
```

You can override that with:

```bash
VITE_RSS_API_BASE_URL=https://your-worker.workers.dev
```

## Cloudflare Pages

This project can be deployed to Cloudflare Pages with Wrangler.

```bash
bun install
bunx wrangler login
VITE_RSS_API_BASE_URL=https://your-worker.workers.dev bun run build
bun run pages:deploy
```

For local Pages preview, build once and then run:

```bash
bun run pages:dev
```

The Pages project is configured in `wrangler.jsonc` with
`pages_build_output_dir: "./dist"`.
If you build on Cloudflare Pages instead of deploying from your terminal, set
`VITE_RSS_API_BASE_URL` as a Pages build environment variable in the
Cloudflare dashboard.

## Scripts

```bash
bun run dev
bun run build
bun run preview
bun run pages:dev
bun run pages:deploy
bun run check
bun run lint
```
