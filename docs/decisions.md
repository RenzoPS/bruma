# Decisions, with the measurements

Every entry here was settled by running something, not by argument. Where a
decision was later overturned, the wrong version is kept — the correction is
usually more useful than the conclusion.

## Retrieval

**The HNSW index was not being used, and the first proof was misleading.**
Ordering by `1 - (embedding <=> $1) DESC` gives a `Seq Scan`; ordering by the
distance operator gives an `Index Scan`. That comparison was run on a bare query.
On the real function — with the `JOIN` and the `WHERE` — at 20 rows the planner
does not use HNSW no matter how the filter is written. Re-measured with 20,020
rows, both filter forms use the index and cost the same (262.16 vs 262.12). The
design is right; the isolated `ORDER BY` was never the real test.

**The similarity threshold was calibrated against negatives that were too easy.**
The first run reported a 0.024 gap and a threshold of 0.61. Adding near-domain
negatives — questions about coffee whose answer is not in the corpus — collapses
it: worst legitimate 0.627, best outsider 0.693, gap **−0.066**. No threshold
separates them, and raising it breaks real questions first. The threshold is now
0.608, calibrated against *far* negatives only, and what actually answers the
near ones is the tool routing: measured against the agent, the five hardest go to
other tools or to none, and never reach the vector search.

**The calibrator itself had a methodological bug.** It fed the top-1 similarity
into the "legitimate" set even when that top-1 was the wrong bean, so a retrieval
error was moving the threshold. It now separates retrieval correctness (Top-1
17/18, Recall@5 18/18) from domain separation, and exits non-zero if the correct
bean does not make the top 5.

## Chunking

**The chunker was benchmarked before being kept.** Against these fichas,
`@langchain/textsplitters` produced 19 chunks to our 20 and scored identically —
same nine answers, same 0.696 mean similarity to three decimals — for 13 MB of
`@langchain/core`. `@chonkiejs/core` cut mid-sentence in 14 of 18 chunks. The
call flips if the fichas ever gain markdown, tables or code.

**The parameter promised a maximum it did not enforce.** Three 400-character
sentences with `maximo` at 600 produced chunks of 799; a single 900-character
sentence came out at 901. On the real corpus it never happened (20 chunks,
longest 485), so the test asserting the maximum passed anyway. Split into
`objetivo` (a target) and `tope` (a guarantee), with adversarial cases in the
suite.

**The spec's ~500 tokens was wrong for this corpus.** Each ficha is ~450 tokens,
so a 500-token chunk swallowed it whole: four chunks for the entire corpus.

## The model

**`gemini-flash-latest` is unusable.** It resolves to `gemini-3.7-flash`, whose
free tier is 20 requests a day — the guardrail suite exhausts it in one run.
`gemini-2.5-flash` answers 404, "no longer available to new users". Running on
`gemini-3.5-flash-lite` with `gemini-3.1-flash-lite` behind it.

**A `-preview` model is not a safety net.** The fallback was
`gemini-3.1-flash-lite-preview` because that was the only 3.1 flash-lite in the
SDK's type list. That list is the SDK's, not the API's: the id without the suffix
exists and answers with tools in ~2.6 s.

**The fallback was worse than the failure it caught.** Treating 503 as a reason
to switch models sent a 0.7 s question to 67 s, because the fallback was slower
than an overloaded primary. 503 is now retried against the primary; the fallback
is for 404 and 429 only, with cooldowns of forever and 30 minutes respectively.

```
                  before      after
menu question     26,280 ms   1,702 ms
ficha question    15,933 ms   2,768 ms (median; 1,440 min, 22,930 max)
no tool           67,364 ms     696 ms
```

The remaining floor is real: a question with a tool is two sequential round trips
to a free-tier model.

## Language

**The prompt could not decide the answer's language.** Three attempts, measured
each time — as its own section, repeated as a closing reminder, and pushed inside
the tool result — all failed on questions that retrieve fichas, because the
Spanish source material is the most recent thing in context when the model
composes. The fix was to take the decision away from the model: the site's
language travels with each question and arrives as a flat, unconditional
directive written in the target language.

## Embeddings

**The binding limit is per-minute and shared.**
`global_embed_content_requests_per_minute_per_base_model` — a free-tier pool that
does not belong to this project alone. A burst of ~25 sequential questions
exhausts it; it recovers in under a minute. Defended with a 1.5 s gap, four
retries with backoff, and a cache of already-embedded questions.

**Staying on `gemini-embedding-001` over `text-embedding-3-small`.** The corpus is
Spanish and Gemini leads the MTEB Multilingual board (68.32 overall, 67.71
retrieval) against 58.96 for `text-embedding-3-large` on the legacy aggregate;
OpenAI's embedding API has no free tier, and the project's constraint is $0
without a card.

## Architecture

**No text-to-SQL.** The model picks a typed function and Zod validates the
arguments, so there is no injection surface to filter. What text-to-SQL wins is
open aggregation over data too large to hand to the model; with sixteen products
that advantage does not exist. Revisit at ten thousand rows.

**No Liquibase or Flyway.** Drizzle already owns the schema; a second system
owning database state costs more than it gives. The master-data loader follows
Flyway's *repeatable migration* shape without adopting Flyway.

**No LangChain or LlamaIndex.** Measured above. The AI SDK is not the wrong tool
either — it gives provider abstraction, streaming, tool calling and the UI stream
protocol, and never claimed to be a RAG framework.

**Managed RAG was considered and rejected for this project, not in general.**
Gemini File Search would remove chunking, embeddings, pgvector and the threshold
entirely; pgai Vectorizer would keep the embeddings in sync automatically and
delete `ingest.ts` and the staleness detection. Both are lighter. Neither would
have surfaced the three findings at the top of this page, because there would be
nothing of ours to look at. For a product with a deadline, start managed and
build the pipeline when a measurement says it is not enough.

## Frontend

**The hero is a video, not an image sequence.** The same 121 frames as WebP
stills weigh 3.8 MB; as H.264 with a keyframe every 12 frames, 972 KB. Seeking
costs p50 0.2 ms, p95 1 ms once buffered.

**Text on the closing frame was measured, not assumed.** The centre of the final
frame is 7.9:1 against `tinta` at the median; the worst 1% is 1.7:1 but sits
where no glyph lands. It is the only place in the site where text goes directly
on a photograph.

**The second pinned section was cut.** Two sections that pin and scrub back to
back are the same idea twice, and the second spends the patience the first one
needed. The roast content lives in station 02, on clean ground, where it can be
read.

**GSAP adds its own transform on top of a Tailwind `translate-*` class.**
Measured: an element with `translate-y-full` and a `yPercent: 100` tween sat at
254 px — twice its height — and finished at 127 px, exactly one height below the
fold, so it never appeared. Initial states are set with `gsap.set()`.

## Answer quality

**Grounding is checked with arithmetic, not with a judge.** Every number of three
digits or more in an answer must appear in what the tools returned. A price that
is not in the output of `buscarProductos` is an invented price, and that is a
fact rather than an opinion. The LLM judge is kept for the one axis that has no
arithmetic form — whether the answer answers the question — because a judge
shares the blind spots of the family it judges. Measured on the first run: it
failed three correct answers, twice by keyword-matching its own criterion.

**The retrieval layer used to leak past the exact layer, and that produced a
hallucination.** `verGranos(soloConStock: true)` excluded the sold-out Nariño;
`buscarEnFichas` returned its tasting notes anyway, knowing nothing about stock;
the model recommended it at $18.500, a price no bean has. Chunks now carry the
price and stock of their bean, from the same `JOIN` that `verGranos` reads
(migration `0005`). This does not blur the exact/semantic split — `contenido`
still comes from a vector and `precio` from a column — it removes the gap the
model was filling in.

**A fact that was right by luck is still ungrounded.** "La bolsa de 250 g"
appeared in two code comments and in no tool output. The model was reciting a
convention it knew. `GRAMOS_POR_BOLSA` now travels with the tools that describe a
bean: it was going to say it either way, so now it says it because it read it.

## Observability

**Structured JSON to stdout, not an SDK.** Render and Cloud Run collect stdout
and parse JSON on their own; one more piece that can fall over costs more than it
saves at this size. If OpenTelemetry is ever needed, the place to wire it is
`src/lib/registro.ts` and not fifty scattered calls.

**The trace id travels through `AsyncLocalStorage`.** A tool runs three layers
below the route — Express, the SDK, the model — and none of those layers is ours,
so there is no parameter to thread. The alternative was a global that two
concurrent questions would trample.

**What is deliberately not logged:** the visitor's question text and the answer
text (only lengths, which explain a latency without keeping what somebody wrote)
and the IP, which the rate limiter uses in memory and never needs to persist.

## Still open

- The eval set is 22 questions. Enough to catch a class of failure, not enough to
  certify quality; 50+ with adversarial paraphrases would be.
- The near-domain guardrail tests assert on a text pattern. A wrong answer
  containing the word "no" passes. The evals cover this better, but those tests
  are still the ones in the suite.
- Retrieval Top-1 is 17/18.
- The rate limiter and the model circuit breaker are per-process.
- The site's server-rendered metadata is Spanish only. Language is chosen on the
  client, so a crawler sees a monolingual site. Deliberate — three pages did not
  justify per-locale routes — but it is a real limitation, not a non-issue.
- The rate limiter and the model circuit breaker are per-process.
