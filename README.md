# BRUMA

A fictional specialty coffee shop that roasts its own beans on site, and
**Brumita**, a RAG assistant that answers questions about the menu and the beans.

This is a portfolio piece. There is no shop, no coffee for sale, and the address,
prices, origins and dates are all invented — the site says so in its own footer.

It exists to demonstrate two things that are usually shown separately: a
retrieval system built and understood end to end, and a frontend with its own
visual system.

```
bruma/
├── apps/
│   ├── web/                Next.js 16 — the site
│   └── api/                Express + TypeScript — Brumita's backend
├── docs/                   the technical documentation
└── docker-compose.yaml     the local stack: web + api + Postgres/pgvector
```

---

## What is interesting here

Not the architecture — hybrid retrieval over pgvector is the textbook shape, and
every framework does the same steps underneath. What is interesting is that
**almost every number in this codebase has a measurement behind it, and the
measurement is written in the comment next to it.**

Three of those measurements overturned something that looked settled:

**The HNSW index was not being used.** `EXPLAIN` showed a `Seq Scan` where the
query ordered by `1 - distance`. And the first proof was itself misleading: it
ran on a bare query, not on the one production uses. Re-measured with 20,000
rows, the real function does use the index.

**The similarity threshold was calibrated against negatives that were too easy.**
Bicycles, the weather, the dollar. With realistic near-domain negatives —
questions about coffee whose answer is simply not in the corpus — the gap goes
**negative**: the best outsider scores 0.693, the worst legitimate question 0.627.
No threshold separates them. What answers them correctly is the tool routing, and
that is now where the guarantee is tested.

**The model fallback was worse than the failure it caught.** Treating a
transient 503 as a reason to switch models sent a 0.7-second question to 67
seconds, because the fallback was slower than an overloaded primary.

And one more, found by the answer-quality evals on their very first run:

**The retrieval layer leaked a product the exact layer had deliberately filtered
out.** Asked for something fruity *to take home today*, `verGranos` correctly
returned the three beans in stock and left out the Nariño. But the vector search
knew nothing about stock, returned the Nariño's tasting notes anyway, and the
model recommended it — at **$18.500**, a price that does not exist, because no
tool had given it one. Two failures from a single gap: the prose arrived without
its bean's hard facts, so the model filled in. Chunks now carry the price and
stock of the bean they came from, from the same `JOIN` that `verGranos` reads.

None of those are visible without measuring, and none of them would be visible at
all in a managed RAG. That is the argument for building this by hand, and it is
the only argument — for a product with a deadline, the managed path is lighter
and probably right.

---

## Running it

You need [pnpm](https://pnpm.io) and Node 24 or newer.

```bash
cp .env.example .env                    # fill in the Gemini key
docker compose up --build               # web :3000 · api :3001 · postgres
docker compose exec api node src/scripts/ingest.ts   # build the vector index
```

Or the two apps directly:

```bash
cd apps/web && pnpm install && pnpm dev
cd apps/api && pnpm install && pnpm dev
```

Full setup, environment variables and the deploy story: [docs/operations.md](docs/operations.md).

---

## Documentation

| | |
|---|---|
| [architecture.md](docs/architecture.md) | The two apps, how a question travels, why the split |
| [rag.md](docs/rag.md) | Chunking, embeddings, retrieval, calibration |
| [agent.md](docs/agent.md) | Brumita: the four tools, the prompt, routing, guardrails |
| [data.md](docs/data.md) | Schema, master data, the three lifecycles |
| [frontend.md](docs/frontend.md) | The design system, the hero, the chat surface |
| [operations.md](docs/operations.md) | Running it, Docker, environment, deploying |
| [evals.md](docs/evals.md) | How answer quality is measured, and what the score does not say |
| [decisions.md](docs/decisions.md) | Every measured decision, with the numbers |

---

## The shape of it

The model **never writes SQL and never queries the database**. It starts each
conversation knowing two things — the prompt, and the descriptions of four
functions — and not a single price.

```
question
   │
   ├─► buscarProductos      the menu: exact, never vectorised
   ├─► verGranos            origin attributes: filters and comparisons
   ├─► buscarEnFichas       the vector search, over prose only
   └─► horariosYUbicacion   hours and address
```

A price is answered exactly or not at all: `SELECT precio FROM productos` gives
**$4.800**, while a price embedded in a vector gives *something like* $4.800,
which is the worst way to answer a price. Only `granos.ficha` — prose about an
origin — is embedded, because meaning is the only thing a `WHERE` cannot find.

The routing between them is not an `if` of ours. All four are declared and the
model picks; the site shows which ones each answer used, read from the message's
own tool parts. It cannot claim it checked the menu when it did not.

---

## Verification

```
65  API unit tests      no Docker, no API key, under three seconds
 9  web unit tests      the tool-part parsing behind the "Consultó" label
51  integration tests   needs Postgres, the index and Gemini quota
22  answer evals        pnpm rag:evaluar — scored on three separate axes
```

CI runs types, unit tests, lint and the web build for both apps on every push
and pull request.
The integration suite and the evals stay out of it on purpose: they spend Gemini
quota, and a pipeline that goes red because a free tier ran out teaches people to
ignore the pipeline.

`pnpm rag:calibrar` measures retrieval (Top-1 17/18, Recall@5 18/18) and
re-derives the threshold, refusing to suggest one if retrieval is broken.

`pnpm rag:evaluar` measures the answers, and scores three things separately
because they break for different reasons and get fixed in different places:

```
RUTEO       consultó lo que correspondía : 22/22 (100%)
FUNDAMENTO  no inventó ningún número     : 22/22 (100%)
RESPUESTA   contesta lo que se preguntó  : 22/22 (100%)
```

**Routing** and **grounding** are decided without a model: routing compares tool
names, and grounding checks that every number of three digits or more in the
answer also appears in what the tools returned. A price that is not in the tool
output is an invented price, and that can be proved rather than argued.
**Answering** is the only axis with an LLM judge, because "does this answer the
question?" has no arithmetic form.

Read that 100% carefully: it is 22 questions, and four of the criteria were
rewritten during the same pass that produced it. The number is not the
achievement — the two bugs the harness caught on its first run are, and both are
now fixed and covered by tests. The set needs to grow to be worth much more than
that.

## What is left

- The eval set is 22 questions. That is enough to catch a class of failure, not
  enough to certify quality; 50+ with adversarial paraphrases would be.
- The LLM judge has a measured false-negative rate: on the first run it failed
  three answers that were correct, twice by keyword-matching the criterion. Its
  prompt now says to judge meaning, but a judge is still the weakest link and
  the reason grounding is not left to one.
- Deploy target for the API is still open: Render or Cloud Run.
- Retrieval Top-1 is 17/18.
- The rate limiter and the model circuit breaker are per-process.

## Licence

MIT for the code. The images are covered separately —
see [docs/images-credits.md](docs/images-credits.md).
