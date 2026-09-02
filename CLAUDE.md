# BRUMA — working notes for Claude

A fictional specialty coffee shop with **Brumita**, a RAG assistant. Portfolio
piece: there is no shop, and the site says so in its own footer.

Read `docs/` before changing anything substantial. This file is the map, not the
documentation.

## Layout

```
apps/web/      Next.js 16 · the site
apps/api/      Express 5 · Brumita's backend
docs/          the technical documentation — start at docs/README.md
docs/specs/    the two original design docs, in Spanish, kept as history
compose.yaml   web + api + Postgres/pgvector
```

The two apps are **independent**: separate `package.json`, lockfile,
`node_modules`, `Dockerfile` and `.gitignore`. Neither imports from the other.
The only exception is a test that reads the front's source as text — see below.

## Language

- **Code, comments and commits: Spanish.** Identifiers included (`buscarEnFichas`,
  `partirEnChunks`, `huellaDeFicha`). Do not rename to English.
- **Documentation and README: English.**
- Comments in `apps/api` use accents; comments in `apps/web` historically do not.
  Match the file you are in.
- User-facing strings live in `apps/web/src/lib/i18n/`, always with correct
  accents.

## How comments are written here

This is the strongest convention in the repo and the easiest to break. Comments
explain **why**, and when the why is a number, the number is in the comment
along with how it was measured. Examples of the register:

> *"Medido con EXPLAIN sobre esta misma base, forzando enable_seqscan = off."*
> *"La primera versión de esto trataba el 503 como motivo de cambio y una
> pregunta simple, que sana tarda 0,7 s, se fue a 67 s."*

If you cannot say why something is the way it is, measure it before writing the
comment. Do not write a comment that promises a guarantee the code does not
give — that has already happened twice here and both times it misled a later
reader. See `docs/decisions.md` for the full log.

## Things that will bite you

- **Next 16 differs from older versions, and there is no note in `apps/web` to
  remind you.** `next dev` writes an `AGENTS.md` there on every run saying so;
  it is gitignored, so it will appear untracked and that is expected — do not
  commit it and do not delete it in a loop. Its advice stands: read
  `apps/web/node_modules/next/dist/docs/` before writing Next-specific code,
  because APIs and file conventions differ from older training data.
- **`output: "standalone"` resolves `next.config.ts` rewrites at build time.**
  That is why the API proxy is a Route Handler and not a rewrite. Do not move it
  back.
- **`exactOptionalPropertyTypes` is on** in the API. `{ foo: undefined }` is not
  the same as `{}`.
- **Zod 4 runs every `.refine()`** even after an earlier check failed. Guard
  against the empty case inside each one.
- **GSAP adds its own transform on top of a Tailwind `translate-*` class.** Set
  the initial state with `gsap.set()`, never with a utility class.
- **`chunks` is derived data.** It can be dropped and rebuilt with
  `pnpm rag:ingest`; two migrations do exactly that.
- The API's `tests/datos-maestros.test.ts` reads `apps/web/src/lib/carta.ts` and
  `i18n/es.ts` as text, at test time only. It is the only place the API looks
  inside the front, and it exists to stop prices, hours and the address from
  drifting between them.

## Commands

```bash
# apps/api
pnpm dev · pnpm test · pnpm test:int · pnpm typecheck
pnpm db:migrate · pnpm db:maestros · pnpm db:setup
pnpm rag:ingest · pnpm rag:calibrar

# apps/web
pnpm dev · pnpm build · pnpm typecheck · pnpm lint

# root
docker compose up --build
```

`pnpm test:int` needs Postgres up, the index built and Gemini quota. It retries
once, because Google's free tier returns 503 intermittently.

## Known open items

- Two pre-existing lint errors in `apps/web`: `Contador.tsx` and
  `lib/i18n/index.tsx`, both the same `set-state-in-effect` rule.
- Five menu photos come from stock banks and need attribution; the footer still
  claims every image is AI-generated. See `docs/creditos-imagenes.md`.
- `public/estaciones/tueste-a.jpg` is orphaned since the roast section was
  removed.
- No answer-quality evals. Retrieval and routing are measured; whether the
  wording of an answer is *good* is not. This is the most valuable thing missing.
- Retrieval Top-1 is 17/18.
