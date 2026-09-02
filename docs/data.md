# Data

Three lifecycles, three mechanisms. Keeping them apart is the part that is easy
to get wrong.

```
1. SCHEMA            tables, indexes, constraints, pgvector, match_chunks
   └─ Drizzle migrations · pnpm db:migrate

2. MASTER DATA       the menu and the origins
   └─ declarative files + idempotent upsert · pnpm db:maestros

3. DERIVED DATA      chunks and their embeddings
   └─ rebuilt from granos.ficha · pnpm rag:ingest
```

## Schema

Three tables.

**`productos`** is the menu — exact, frequently changing, never vectorised,
because a price is answered exactly or not at all.

**`granos`** holds each origin, with a long `ficha` in prose. That prose is the
only thing indexed.

**`chunks`** holds pieces of those fichas with their 768-dimension embedding, an
HNSW index, and three columns of indexing state — `posicion`,
`modelo_embedding`, `ficha_hash` — explained in [rag.md](rag.md).

Prices are stored in cents. Never floats: `0.1 + 0.2` is not `0.3` and a menu
does not round itself.

`clave` is the business key. The serial `id` identifies nothing between two runs
of the loader — it changes if rows are inserted in a different order — and
`clave` is also the `ON CONFLICT` target of the upsert. Without it, applying the
menu twice would duplicate rows instead of updating them.

The closed vocabulary — categories, processes, roast profiles, and the embedding
dimensions — lives once, in `src/dominio.ts`. Each of those used to exist in
three places: a Zod enum in the tools, a TypeScript union in the catalogue
service, and a comment beside the column. They had already drifted: the comment
on `categoria` read `cafe | desayuno | pasteleria | promo` while the real values
were `cafe | acompanar | desayuno | grano`. Nobody notices, because a comment
cannot fail.

## Master data is not seed data

A seed is filler you develop against: throwaway, never shipped, and nobody minds
if it is lost. This is the opposite — with `productos` empty the system does not
work, because Brumita has nothing to answer a price question with. It is
*reference data*: versioned alongside the schema and applied in every
environment, production included.

It lives in `src/db/maestros/`, typed against the schema, and
`src/db/maestros/aplicar.ts` applies it.

**It is idempotent.** Run it once or fifty times and the database ends up the
same, which is what lets it run on every boot without anyone tracking whether it
already ran. That comes from `ON CONFLICT DO UPDATE` on `clave`, with the column
reference rather than a string as the conflict target, so renaming a column in
`schema.ts` updates the target with it.

This is the same shape as Flyway's **repeatable migrations** (`R__` prefix):
declarative reference data, re-applied when it changes, run after the versioned
migrations. Drizzle's own documentation recommends exactly this upsert form for
it. It is *not* `docker-entrypoint-initdb.d`: that runs while Postgres
initialises the cluster, before any table exists, so the inserts fail on
`relation "productos" does not exist` and take the container's startup down.

Reference data that evolves does not belong in migrations. Each price correction
would become another patch file, and reading the current menu would mean
replaying a dozen of them in order.

### What happens when something disappears

**It never deletes.** Dropping a product from the file leaves its row in place;
retiring one means `disponible: false`, and retiring a bean means `stock: false`
— so Brumita can say *"we don't have that any more"* instead of behaving as if it
never existed.

That policy was decided but invisible, which is nearly the same as not having
one. For beans it has a direct consequence on the RAG: the orphaned ficha is
still there, so `rag:ingest` keeps indexing it and Brumita keeps recommending an
origin that is no longer in the catalogue. `db:maestros` now lists the orphans at
the end:

```
Están en la base y ya no en los archivos maestros:
  · producto "merienda-invierno"
```

It does not delete them. Dropping production rows is not a decision a script
makes on its own.

## The deliberate duplication

Beans appear in both tables: as a counter item in `productos` and as an origin
with a ficha in `granos`. Two rows, two prices.

That is denormalisation on purpose, and it is guarded:
`tests/datos-maestros.test.ts` fails if the price or the availability of a bean
disagree between the two. Same test file also reads the front's `carta.ts` and
`i18n/es.ts` and fails if the menu, the address or the opening hours drift
between the two apps. It is the only place the API looks inside the front, and it
happens at test time only — no runtime import, nothing in the image.

It matters more for the hours than for the prices: a stale price is visible to
anyone reading the menu, but a stale opening hour makes Brumita send somebody to
a closed shop.

## Adding something tomorrow

**A new product** — a combo, a coffee, a pastry:

1. Add the row to `src/db/maestros/productos.ts`, with its `clave`.
2. Add it to `apps/web/src/lib/carta.ts` if it should appear on the site.
3. Deploy. `migrate` runs, the upsert applies it.

No migration is generated — the schema did not change — and **no reindexing**,
because products are not vectorised. Verified end to end: a combo added this way
is answered with its correct price on the next deploy.

**A new bean** is the same plus two steps: it goes into `granos.ts` *and*
`productos.ts` (the parity test enforces they agree), and because it has a ficha
it needs `pnpm rag:ingest`. If you forget, the server says so at boot. Then
`pnpm rag:calibrar`, because the threshold belongs to the corpus and the corpus
changed.

**A price change** is editing one line and deploying.

## Migrations

```bash
pnpm db:generate   # write a migration from the schema
pnpm db:migrate    # apply pending migrations
pnpm db:maestros   # apply the reference data (idempotent)
pnpm db:setup      # both, in order
```

The first migration carries a hand-added `CREATE EXTENSION vector`; `drizzle-kit`
does not generate it, and without that line the `vector(768)` column below it
fails. The second adds `clave UNIQUE`. The third is a **custom migration** —
generated with `drizzle-kit generate --custom` and registered in the journal like
any other — carrying `match_chunks`. A Postgres function is part of the
structure of the database, so `pnpm db:migrate` on an empty database has to be
enough to reconstruct it.

Two of the migrations start by emptying `chunks`. That is safe by design and it
illustrates the property: chunks are derived. The source of truth is
`granos.ficha`, and the index is a projection rebuilt by one command. Adding a
`NOT NULL` column to a table of derived rows has no value to invent, so the rows
go and come back.

Note that **Drizzle Studio cannot open the `chunks` table** — it does not handle
custom extension types and returns a deserialisation error.
