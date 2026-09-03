# Brumita

The barista. She tutears in rioplatense Spanish, answers in two or three
sentences, and says "I don't have that" rather than filling a gap with something
plausible.

## Four tools, and no generated SQL

```
buscarProductos({ categoria?, precioMaximo?, soloDisponibles? })   the menu
verGranos({ proceso?, perfil?, precioMaximo?, soloConStock? })     origin attributes
buscarEnFichas({ consulta })                                      the vector search
horariosYUbicacion()                                              hours and address
```

The model picks a function and fills its arguments; Zod validates them before
they reach the database. There is no injection surface because there is nothing
generated to execute — no blocklist of forbidden words is needed, because no free
text reaches the query. `categoria` is one of four values or the call is
rejected.

**The tool descriptions are code.** They are literally what decides whether a
price question goes to the menu or to the vector search, so they say *when to use
each one* rather than what each one returns — including what they do not do:
*"NO devuelve a qué saben: para eso está buscarEnFichas."*

### Why not text-to-SQL

This is the one place where the design diverges from the tutorial shape. The
alternative is to hand the model the table schema, have it emit a `SELECT`,
validate that the string contains no `INSERT`/`UPDATE`/`DELETE`/`DROP`, and run
it with a row limit.

A blocklist of forbidden words is fragile by nature — it does not cover comments,
chained statements, CTEs, or subqueries calling functions — and the row limit is
a damage ceiling, not a barrier.

What text-to-SQL genuinely wins is open aggregation over data too large to hand
to the model: `MAX`, `GROUP BY`, `HAVING`, *"who spent the most in total?"*. With
sixteen products `buscarProductos({})` returns the lot and the model reads the
largest, so that advantage does not exist here. It would at ten thousand rows,
and that is when this decision gets revisited.

Run against the live system:

```
"tengo 1000 pesos, ¿qué me puedo comprar?"  ->  buscarProductos({precioMaximo: 1000})
"¿cuál es el producto más caro?"            ->  buscarProductos({}) and reads the last
```

The model generates the **argument**, not the **statement**.

### What comes back, and what the model actually sees

The model does not call anything. It emits a tool call as *text* — a name and
some arguments — and our code is what runs:

```
1. we send    prompt + history + the four tool descriptions
2. model emits  { toolName: "buscarEnFichas", args: { consulta: "…" } }
                 ← still text. Nothing has executed.
3. we run     Zod validates the args, then the tool's `execute`
4. we send    the result back as another message in the conversation
5. model      writes the answer, now with the data in front of it
```

Step 3 is where Drizzle and pgvector do their work, and **none of it is visible
to the model**. It never sees the schema, a `SELECT`, or a single vector.
Embeddings exist to *find* the chunks; what travels back is plain data:

```ts
{
  contenido: "En taza da chocolate amargo y nuez, con un cuerpo…",
  granoClave: "cerrado",
  granoNombre: "Cerrado",
  granoPrecio: 15500,
  granoStock: true,
  similitud: 0.741
}
```

That shape is also the answer to how the model groups five chunks from three
different beans: it reads `granoNombre` on each one. The `JOIN` already happened
in Postgres — there is no relational reasoning left for the model to do, which
is the point. It is the same reason `granoPrecio` and `granoStock` ride along:
see [rag.md](rag.md) for the hallucination that closed.

## The prompt

`src/agente/prompt.ts`. It is a guardrail, not a character sheet. Every line that
looks like tone is holding something down: *"contestá corto"* stops it returning
a brochure, *"los precios salen de la carta"* stops it inventing one with
confidence, and *"si no lo tenés, decilo"* is the only defence against a question
no tool answers.

**It holds no facts.** The address, the opening hours and the rules of the house
used to be in it *and* in `horariosYUbicacion()` — two sources for the same fact,
so the day the hours change one goes stale and Brumita states it with confidence.
The prompt now says who she is and how she behaves; the facts come from a tool.
That also makes true the sentence the prompt itself asserts: that the tools are
her only source.

She breaks character exactly once. Asked directly whether BRUMA is real, she says
it is a portfolio piece and the address leads nowhere — because somebody could
otherwise take a bus to Cabrera 4680.

## Language

**She answers in whatever language the site is set to.** The visitor picks it from
the navbar, so it is explicit and under their control.

That decision is made in code and reaches the model as a flat, unconditional
directive written in the target language, and that shape is the point. Asking the
model to work out the language from the question was tried three ways and
measured each time: as its own prompt section, repeated as a closing reminder,
and pushed inside the tool result. All three failed on the same kind of question,
because the origin notes are written in Spanish and are the most recent thing in
context when the model composes — they outweigh an instruction from twenty
messages back.

The fix was not to word the rule better, it was to take the decision away from
the model. It is bad at *choosing* a language with foreign material in front of
it; it is fine at obeying a flat statement.

The site language wins over the message language, in both directions, and there
are integration tests for both crossings.

## The model, and its fallback

| | |
|---|---|
| Primary | `gemini-3.5-flash-lite` |
| Fallback | `gemini-3.1-flash-lite` |
| Temperature | 0 |
| Max tool rounds | 8 |

Pinned, and not out of habit. `gemini-flash-latest` resolves to
`gemini-3.7-flash`, whose free tier is **20 requests a day** — measured against
the API; the guardrail suite exhausts it in one run. `gemini-2.5-flash` answers
404, *"no longer available to new users"*. The thing to watch when moving it is
the free-tier quota, not the model's date: the newest flash is usually the
stingiest.

**503 does not switch models, and that correction is worth the paragraph.** The
first version treated overload as a reason to fall back, and the fallback — then
a `-preview` model — returned 503 in one run and took between 30 and 67 seconds
in another. A 0.7 s question went to 67 s. A fallback slower than the failure it
catches is not a fallback, it is a downgrade. Now 503 is retried against the
primary, which recovers on its own, and the fallback is reserved for 404 (model
withdrawn) and 429 (quota exhausted) — the two cases where insisting cannot help.
The cooldown differs accordingly: 30 minutes for an exhausted quota, forever for
a withdrawn model.

The swap happens inside an SDK middleware rather than a `try/catch` in the route,
so it lands before the first byte reaches the visitor. What it does **not** cover
is an error mid-generation, with the stream already running — that is the route's
`onError`, which tells the visitor and offers to retry.

**Temperature 0 is not what stops her inventing.** It reduces variance, nothing
more; a deterministic model can hallucinate the same invented price every time.
What holds the grounding is that the tools are the only source, that they return
empty when there is no data, that the prompt says explicitly to answer "I don't
have it", and the tests that check all three.

## Guardrails, and what is actually tested

`tests/integracion/brumita.test.ts` asserts **which tool was called**, not the
wording of the answer. That is the deterministic part and the one that matters:
if a price question does not call `buscarProductos`, the price came from nowhere,
whatever the sentence says.

Covered: routing per question type, crossed questions using two sources, not
inventing a product that is not on the menu, out-of-domain questions, not leaking
the prompt, not breaking character on request, telling the truth about the
fiction, and both language crossings.

Plus the questions the threshold cannot filter. Those are the near-domain
outsiders from the calibration — *"do you have decaf?"*, *"do you sell
capsules?"*, *"do you have a Kenyan bean?"* — which score above legitimate
questions and pass the threshold. The retrieval layer cannot defend them; the
routing can, and these tests are what stops that defence from breaking silently.

### Where the tests are weak

The near-domain assertions match on a pattern (`/\bno\b|tampoco|solo/`). A wrong
answer containing the word "no" passes. It is the softest part of the suite and
it gives more confidence than it earns.

Answer quality is measured separately, by `pnpm rag:evaluar`: 22 versioned
questions scored on routing, grounding and whether the answer answers. Routing
and grounding are decided without a model — grounding checks that every number of
three digits or more in an answer appears in what the tools returned, so an
invented price is proved rather than argued. That has its own document:
[evals.md](evals.md).

It caught two real failures on its first run, both now fixed: a bean recommended
as available that `verGranos` had filtered out for being sold out, quoted at a
price that does not exist; and a true fact — the 250 g bag — that no tool had
ever provided.

The set is 22 questions. That is enough to catch a class of failure, not enough
to certify quality.

## The step budget, and the silent failure it caused

`stopWhen: isStepCount(8)` caps how many tool turns the model may chain before it
has to answer. It used to be 5, and 5 was too few — measured, not guessed.

Running *"¿qué grano tenés que sea frutado y que me lo pueda llevar hoy?"* five
times gave 2, 2, 2, 5 and 3 tool calls. The run that hit 5 spent its whole budget
searching and had no turn left to write, so the visitor got an **empty bubble**
and the server logged a clean `200`. The cap was not stopping a loop; it was
cutting off an answer that was about to arrive. At 8, six consecutive runs came
back with 1–3 calls and no empty answers.

The cap still has to exist — it is the only thing standing between a strange
conversation and an unbounded spend. So the failure is handled in the other two
places rather than removed:

- The route logs `chat.sale` at **warn** when the answer is empty, with the SDK's
  `finishReason`. An empty answer leaves no other trace: a blank bubble and a
  200.
- The chat panel renders a message and a retry button instead of an empty turn.
  A blank bubble is the worst way to fail, because it does not look like an error
  — it looks like Brumita had nothing to say.

## Transport

`POST /chat` streams. The body is validated by `express-zod-safe` against a
narrow schema — known roles, text parts only — and the `ModelMessage` is built
from that, so a tool part invented by the client or a `system` role with new
instructions has no way in. Rate limited to 30 questions per IP per five
minutes, applied **before** validation: if it counted after, sending garbage
would be free and unlimited.

Tool parts travel to the front on purpose. That is what renders *"Consultó:
Carta"* under each answer, and it is the visible half of the routing.
