# The RAG

Only `granos.ficha` is vectorised. Everything else — prices, stock, categories,
hours — is read with exact SQL through typed tools. See
[architecture.md](architecture.md) for why.

## Building the index

`pnpm rag:ingest` runs `src/scripts/ingest.ts`, which does four things:

1. Reads the fichas from the database.
2. Cuts them with `partirEnChunks()` (`src/rag/chunking.ts`).
3. Embeds them with `embeberDocumentos()` (`src/rag/embeddings.ts`) — one call
   for all 20 chunks, not 20 calls.
4. Replaces the index inside a transaction.

The order of the last two matters. Embeddings are generated **before** the
transaction opens, so if Gemini fails the old index is still there and Brumita
still answers. Deleting first and failing afterwards would leave her with
nothing to retrieve.

It is not incremental: it rebuilds all four fichas. At this size that is one API
call, and comparing hashes per chunk to regenerate only what changed would be
machinery that does not pay for itself.

It is also **not** part of `docker compose up`, on purpose: it costs network,
quota and money, and regenerating identical vectors on every boot buys nothing.
If you forget it, the server says so at boot — see *Detecting a stale index*.

## Chunking

`src/rag/chunking.ts`, no library. The paragraph is the unit, because the fichas
are written one topic per paragraph — origin, process, roast, cup, brewing. A
chunk that spans two produces a vector that represents neither.

```
ficha "guji": 1905 characters, 5 paragraphs
  #0  397 chars   origin
  #1  411 chars   process
  #2  396 chars   roast
  #3  328 chars   cup
  #4  365 chars   brewing
```

**`objetivo` is a target, `tope` is the guarantee**, and the difference was
measured. The parameter used to be called `maximo` and the code promised chunks
would respect it. They did not: three 400-character sentences with `maximo` at
600 produced chunks of **799**, because the overlap reopens the next chunk with
the last sentence written, and a single 900-character sentence came out whole at
**901** — the algorithm refused to cut inside a sentence and had no escape.

On the real corpus it never happened (20 chunks, longest 485), so the test that
asserted the maximum passed anyway. There is now a hard `tope` that splits on
the nearest space when a sentence has nowhere else to break, and the adversarial
cases are in the suite.

Overlap is applied **only** when a paragraph has to be split mid-idea. Repeating
a sentence across a natural boundary just adds another topic to the vector.

### Why the chunker is hand-written

It was benchmarked. Against these fichas, `@langchain/textsplitters` produced 19
chunks to our 20 and scored **identically on retrieval — the same nine answers,
the same 0.696 mean similarity, to three decimals**. It costs 13 MB of
`@langchain/core` to match code that already exists. `@chonkiejs/core` cut
mid-sentence in 14 of 18 chunks.

That call flips if the fichas ever gain markdown, tables or code: LangChain
recurses down to characters and this does not.

The spec's original ~500 tokens was wrong for this corpus. Each ficha is ~450
tokens, so a 500-token chunk swallowed it whole — four chunks for the entire
corpus. At ~600 characters it splits into 20.

Note that the AI SDK has no chunker: its own RAG guide uses `input.split('.')`,
which breaks on `1.750 metros`.

## Embeddings

`gemini-embedding-001`, forced to 768 dimensions. Two functions, and they are
not interchangeable:

| Function | When | `taskType` |
|---|---|---|
| `embeberDocumentos()` | Once, at ingest | `RETRIEVAL_DOCUMENT` |
| `embeberConsulta()` | Every visitor question | `RETRIEVAL_QUERY` |

Google trains the model so a document and the question that should find it land
near each other, **but only if each side declares what it is**. Embedding both as
generic text retrieves worse.

### The quota

The limit this project hits first is not the daily one and not tokens: it is
`global_embed_content_requests_per_minute_per_base_model` — requests per minute,
and `global` is not decorative, it is a free-tier pool that does not belong to
this project alone. A sequential burst of ~25 questions exhausts it and it
recovers in under a minute.

Two defences: a **1.5 s minimum gap** between calls, so a single visitor's
question waits for nothing while `rag:calibrar` and the integration suite stop
machine-gunning the API; and **four retries with backoff**, because against a
shared pool another project can hold the quota when your turn arrives and going
slower does not help — waiting does. A cache of already-embedded questions sits
on top: an embedding is deterministic for a given text and model, so nothing
there can go stale.

## Retrieval

The query lives in Postgres, as `match_chunks(query_embedding, match_threshold,
match_count)` — the `match_documents` pattern of the pgvector ecosystem. It was
adopted for a reason `EXPLAIN` settles, not for convention.

```
ORDER BY 1 - (embedding <=> $1) DESC   ->  Seq Scan on chunks
ORDER BY embedding <=> $1              ->  Index Scan using chunks_embedding_idx
```

HNSW indexes the distance operator, not an expression derived from it. Ordering
by descending similarity is, to the planner, ordering by an arbitrary function.
Both orders return the same rows; only one scales.

**A correction worth keeping**, because the first measurement was misleading:
that comparison was run on a bare query. On the real function — with the `JOIN`
and the `WHERE` — at 20 rows the planner does **not** use HNSW no matter how the
filter is written. Measured again with 20,020 rows, both filter forms use
`Index Scan using chunks_embedding_idx` and cost the same (262.16 vs 262.12).
So the index is reachable, the design is right, and the isolated `ORDER BY` was
never the real test.

## The threshold, and what it cannot do

`pnpm rag:calibrar` answers two separate questions, and keeping them apart is the
point of the script. The first version mixed them: it fed the top-1 similarity
into the "legitimate" set even when that top-1 was the wrong bean. A retrieval
error — which no threshold fixes — was moving the threshold.

```
RETRIEVAL      Top-1 correct  17/18      Recall@5  18/18
SEPARATION     worst legitimate (correct chunk)  0.6269
               best far-off-domain               0.5900
               gap                               0.0369
               suggested threshold               0.608
```

**The first calibration was wrong, and finding out why is the interesting part.**
It reported a clean 0.024 gap and a threshold that appeared to separate the
domain. That was an artefact of the negatives being too easy — bicycles, the
weather, the dollar. Adding *near* negatives, questions about coffee and about
BRUMA whose answer is simply not in the corpus, collapses it:

```
worst legitimate question  0.627
best near-domain outsider  0.693   ← "do you have a Kenyan bean?"
gap                        -0.066
```

**No threshold separates those**, and raising it to try breaks real questions
first: the ceiling is 0.627. It is not a flaw in the corpus or the chunker
either — it is the limit of what cosine similarity can decide. *"Do you have a
Kenyan bean?"* looks like *"what is the Ethiopian one like?"*, and it should.

What answers them correctly is the tool routing. Measured against the agent, the
five hardest go to `verGranos`, to `buscarProductos`, or to no tool at all — none
of them reaches `buscarEnFichas`. So the threshold is the net underneath for what
is *far* away, not the gatekeeper of the domain, and the guarantee that matters
lives in `tests/integracion/brumita.test.ts`.

Re-run the calibration whenever the fichas change: the number belongs to the
corpus, not to the code. The script exits non-zero if the correct bean does not
make the top 5, because calibrating on a broken retrieval is picking a number for
a system that is already failing somewhere else.

## Detecting a stale index

`chunks` carries `modelo_embedding` and `ficha_hash` beside the vector, and both
exist for the same reason: this failure is **silent**. Change the model, or edit
a ficha, forget to reindex, and search does not break — it quietly gets worse.

- `modelo_embedding` catches a model change. An embedding is only comparable with
  another from the same model, however many numbers it has.
- `ficha_hash` catches the likelier cause: someone edits a ficha, runs
  `db:maestros`, forgets `rag:ingest`. The hash covers the chunking parameters as
  well as the prose, so changing `objetivo` or `tope` invalidates it too — which
  avoids a version number somebody has to remember to bump.

Both are checked **once when the server boots**, not on every search and not in
`/healthz`, which the keep-alive pings around the clock and which deliberately
never touches the database. They warn, they do not refuse: a stale index answers
worse but it answers, and taking the site down over it would be worse than the
problem.

```
El índice no corresponde a las fichas actuales de: guji.
Brumita va a contestar con contenido viejo sin dar ningún síntoma.
Corré `pnpm rag:ingest` para reconstruirlo.
```

`posicion` is the third column of indexing state: it makes rebuilding
deterministic, it is what `UNIQUE (grano_id, posicion)` enforces, and it is what
a longer corpus would need to pull the neighbours of a chunk that landed
mid-explanation.

## What is deliberately not here

No reranker, no hybrid lexical search, no query rewriting, no per-chunk hashing
for incremental reindexing, no `rag_documents` abstraction, no LangChain, no
LlamaIndex. With 20 chunks none of it earns its place, and not having it is as
much a part of the reasoning as having the rest.
