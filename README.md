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

## Scripts

```bash
bun run dev
bun run build
bun run preview
bun run check
bun run lint
```
