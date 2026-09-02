# Running and deploying

You need [pnpm](https://pnpm.io) and Node 24 or newer. Node 24 matters: the API
runs TypeScript directly, with no build step.

```bash
cd apps/web && pnpm install && pnpm dev    # http://localhost:3000
cd apps/api && pnpm install && pnpm dev    # http://localhost:3001
```

The site works on its own. Brumita needs the API.

### If `pnpm install` fails

Each app has a `pnpm-workspace.yaml` that exists only to declare which
dependencies may run install scripts. pnpm blocks them all by default, which is
right — a `postinstall` is third-party code running on your machine — so they are
enabled one at a time. The web app allows `unrs-resolver` and the API allows
`esbuild`, both to fetch native binaries.

## Environment

One `.env`, at the repository root.

```bash
cp .env.example .env      # fill in the Gemini key
```

Everything reads it. Compose interpolates the `${...}` in `docker-compose.yaml` from it,
and everything that runs outside Docker receives it explicitly:

| Consumer | How it gets there |
|---|---|
| `docker compose` | picks up `.env` beside `docker-compose.yaml` on its own |
| `pnpm dev`, `db:maestros`, `rag:ingest`, `rag:calibrar` | `--env-file=../../.env` |
| `drizzle-kit` (`db:migrate`, `db:studio`) | `process.loadEnvFile` in `drizzle.config.ts` |
| `pnpm test:int` | `tests/env.ts`, loaded as a vitest setup file |

The last two exist because neither tool accepts Node's `--env-file`: drizzle-kit
looks for a `.env` in its own working directory, and vitest starts the process
itself.

`DATABASE_URL` is the one variable with two correct values. In `.env` it points at
`localhost` and the published port, which is how the host reaches the container.
Inside the Compose network the host is `postgres`, so `docker-compose.yaml` redefines the
variable in its `environment:` block and overrides the file. Write it out in full:
Node's `--env-file` does not expand `${...}`, so composing it from `POSTGRES_USER`
and friends would not work.

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | the local stack below, or [Neon](https://neon.com) — free Postgres with pgvector |
| `GOOGLE_GENERATIVE_AI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) — free tier, no card |
| `ORIGENES_WEB` | comma-separated CORS allowlist; defaults to `http://localhost:3000` |
| `BRUMITA_API_URL` | read by the web app at runtime; defaults to `http://localhost:3001` |

Config is validated at boot, not on use: if a key is missing you find out when
the server starts, not when a visitor asks the first question.

## Commands

| In `apps/api` | |
|---|---|
| `pnpm dev` | Dev server on :3001, watching |
| `pnpm test` | Unit tests — no Docker, no API key, under four seconds |
| `pnpm test:int` | Integration — needs Postgres, the index and Gemini quota |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:generate` · `pnpm db:migrate` | Migrations |
| `pnpm db:maestros` · `pnpm db:setup` | Reference data, and both in order |
| `pnpm rag:ingest` | Rebuild the vector index |
| `pnpm rag:calibrar` | Re-measure retrieval and the threshold |

| In `apps/web` | |
|---|---|
| `pnpm dev` · `pnpm build` · `pnpm typecheck` · `pnpm lint` | |

| At the root | |
|---|---|
| `docker compose up --build` | The whole stack |
| `docker compose down -v` | Stop it and drop the database |

`pnpm typecheck` is not optional in the API: Node strips the types to run the
file, it does not check them. A type error will not stop the program at runtime.

The integration suite retries once per case. That is against Google, not against
us: the free tier returns 503 "high demand" intermittently, and in two
consecutive runs different cases failed with that error after the three attempts
the SDK already makes. Raising the app's own retries would make a visitor wait
thirty seconds to paper over a problem that is not theirs. If a case starts
needing the retry *every* time, that is no longer a Google spike and should be
looked at.

## Docker

Both apps have a production image: multi-stage, Alpine, non-root.

```bash
cp .env.example .env      # fill in the Gemini key
docker compose up --build
```

| Service | Port | |
|---|---|---|
| `web` | 3000 | built from `apps/web` |
| `api` | 3001 | built from `apps/api` |
| `postgres` | 5432 | `pgvector/pgvector:pg18` |
| `migrate` | — | runs once and exits |

```
postgres  ─healthy─►  migrate  ─exit 0─►  api  ─healthy─►  web
                         │
                         └─ drizzle-kit migrate
                            node src/db/maestros/aplicar.ts
```

`api` waits for Postgres to be *healthy*, not merely running, and for `migrate`
to have exited with 0 — so a failed migration stops the API from booting against
a half-built database. The healthchecks hit `127.0.0.1` rather than `localhost`,
because inside the container `localhost` resolves to `::1` first and both servers
listen on IPv4.

The stock `postgres` image does not carry pgvector, so the base is
`pgvector/pgvector`. **The data volume mounts at `/var/lib/postgresql`, not
`/var/lib/postgresql/data`** — Postgres 18 stores data in a per-major-version
subdirectory, and mounting over `/data` stops the container from starting.

What does **not** run here is embedding ingestion. Run it inside the container
once the stack is up:

```bash
docker compose exec api node src/scripts/ingest.ts
```

Image sizes: `node:24-alpine` is 235 MB, `api` 293 MB, `web` 302 MB, `migrate`
455 MB. The runtime images add 58–67 MB over the base; `migrate` is the fat one
because it carries `drizzle-kit`, a devDependency, and it runs once and dies.

**If builds feel slow, check `docker buildx`.** Without it Compose falls back to
the classic builder, which builds services sequentially, does not parallelise
independent stages — the API image runs `pnpm install` twice — and supports no
cache mounts. On Arch: `yay -S docker-buildx`.

## The API proxy, and a production-only bug

The chat calls `/api/brumita/chat`, a Route Handler in the web app that proxies
to the API and forwards `x-forwarded-for` so the API's per-IP limit sees the
visitor rather than the Next container.

It is a Route Handler and **not** a `next.config.ts` rewrite, and that
distinction cost a bug that only appeared in production. With
`output: "standalone"` rewrites are resolved when the image is built and the
destination is baked into `required-server-files.json` — at build time
`BRUMITA_API_URL` is not set, so the fallback to localhost was frozen in, and the
`web` container ended up asking its own localhost for the API:

```
connect ECONNREFUSED 127.0.0.1:3001
```

It worked in dev and only failed in the container. A Route Handler reads the
environment on every request, so the image does not know which API it runs
against and the same one serves local Compose and a real deploy.

## Security posture

Helmet sets the headers, with a CSP of `default-src 'none'` — this is a JSON API
and there is nothing for a browser to render. CORS is an allowlist read from
`ORIGENES_WEB`, not a `*`: the container publishes 3001 and the API gets its own
URL in production, so any page on the internet could otherwise spend this
project's Gemini quota from a visitor's browser. Rate limit is 30 questions per
IP per five minutes, in-process — with replicas each one keeps its own count,
which is documented rather than solved, because Redis would cost more than it
saves at this size.

## Deploying

| Piece | Where | Cost |
|---|---|---|
| `apps/web` | Vercel | $0 |
| `apps/api` | Render or Cloud Run | $0 |
| Database | Neon | $0 |
| Models | Gemini free tier | $0 |

Render sleeps after 15 minutes and takes about a minute to wake, but gives 750
h/month: enough to stay awake with a ping every 10 minutes to `/healthz`, which
is why that endpoint deliberately never touches the database. Cloud Run starts in
1–2 s and gives 2M requests/month but asks for a card. The decision is still open;
the API is containerised, so it runs on either.

Deploy order:

```
pnpm db:migrate  →  pnpm db:maestros  →  app ready
```

`rag:ingest` is not in that chain. Run it when the fichas change, which the boot
check will remind you about if you forget.
