# Architecture

## Two independent apps

```
apps/web/            Next.js 16 · React 19 · Tailwind 4 · GSAP · Motion
apps/api/            Express 5 · Drizzle · Vitest · AI SDK
docker-compose.yaml  web + api + Postgres/pgvector
```

Each app owns its `package.json`, lockfile, `node_modules`, `Dockerfile` and
`.gitignore`, and neither imports from the other. The only thing at the root is
`docker-compose.yaml`, which wires them together for local testing and owns nothing
they need to run.

There is one deliberate exception: `apps/api/tests/datos-maestros.test.ts` reads
`apps/web/src/lib/carta.ts` and `i18n/es.ts` **as text, at test time**, and fails
if the menu prices, the opening hours or the address disagree between the two.
No runtime import, nothing in the image. See [data.md](data.md).

## Inside the API

```
src/
├── db/          schema, client, maestros/          the data
├── rag/         chunking, embeddings, retrieval    the knowledge layer
├── agente/      prompt, herramientas, brumita      the agent layer
├── services/    catalogo, health                   domain reads that are not RAG
├── lib/         env, limite                        plain infrastructure
├── routes/      health, chat
├── scripts/     ingest, calibrar                   operational commands
└── dominio.ts   the closed vocabulary of the business
```

`rag/` and `agente/` used to be spread across `lib/` and `services/`, beside
`env.ts` and the rate limiter. Grouping them costs nothing and makes the thing
this project is about a folder you can open. `ingest.ts` stays in `scripts/`: it
is a command you run, not a piece the server imports.

## How a question travels

The model **never queries the database and never writes SQL**. It starts each
conversation knowing exactly two things: the prompt, and the descriptions of
four functions. It does not know a single price.

```
question
   │
agente/brumita.ts ──► model
   │                    │  "call buscarProductos({ categoria: 'desayuno' })"
   │               Zod validates the arguments
   │                    │
   │           services/catalogo.service.ts ──► SELECT ──► rows
   │                    │
   └──────────────► model, second pass ──► answer
```

For a question about flavour the middle leg is different:

```
rag/retrieval.ts ──► rag/embeddings.ts ──► 768 numbers
                          │
                   match_chunks() in Postgres ──► top 5 chunks above the threshold
```

Both legs are the same mechanism: the model asks for a function, our code runs
it, the result goes back into the conversation, and only then does the model
write. It can chain up to five of these rounds before it has to answer.

## Why the split between exact and semantic

A price is answered exactly or it is not answered. `SELECT precio FROM productos
WHERE clave = 'flat-white'` gives **$4.800**; a price embedded in a vector gives
*something like* $4.800, which is the worst way to answer a price. So the menu is
never vectorised.

What does get vectorised is `granos.ficha`: prose about an origin, its process,
its roast, how it tastes. That is the only thing the model cannot know in
advance and the only place where the question is about meaning rather than an
exact value.

The routing between the two is not an `if` of ours. All four tools are declared
and the model picks; the front shows which ones each answer used, read from the
message's own tool parts. Making the mechanism visible is half the point of the
project.

## The web app

Three pages — the place and the process, the menu, the origins — plus Brumita's
chat, which lives in the layout so the conversation survives navigating between
them.

The chat calls `/api/brumita/chat`, a Route Handler that proxies to the API.
Same origin, so no CORS preflight and the API's URL never reaches the browser.
It is a Route Handler and **not** a `next.config.ts` rewrite for a reason that
cost a production-only bug — see [operations.md](operations.md).
