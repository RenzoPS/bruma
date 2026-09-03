# Answer quality

Retrieval is measured by `pnpm rag:calibrar` and routing by the integration
suite. Both are properties of the system. Neither answers the question that
actually matters: **did the person who asked get something useful?**

`pnpm rag:evaluar` answers that one. It runs a versioned set of 22 questions
through the real agent and scores three things separately.

```
RUTEO       consultó lo que correspondía : 22/22 (100%)
FUNDAMENTO  no inventó ningún número     : 22/22 (100%)
RESPUESTA   contesta lo que se preguntó  : 22/22 (100%)
```

## Why three axes and not one score

They fail for different reasons and are fixed in different places. An answer can
route perfectly and say nothing useful, or read beautifully while quoting a price
that does not exist. A single percentage hides which of the three broke.

**Routing** is decided without a model. The case declares which tools had to run
and which would be a routing error, and the check compares tool names. Nothing
subjective.

**Grounding** is also decided without a model, and it is the axis that matters
most. Every run of three digits or more in the answer must also appear in what
the tools returned, separators stripped. A price that is not in the output of
`buscarProductos` is an invented price — that can be *proved*, not argued.

Three digits is a deliberate floor. It covers prices (1.400 to 18.000), altitudes
(1.150 to 2.100) and grams (250) — the facts that get stated with confidence.
It leaves out one- and two-digit numbers because at that length any stray digit
in a tool's output matches by chance, and a check that almost always passes
checks nothing.

**Answering** is the only axis with an LLM judge, because "does this answer the
question?" has no arithmetic form. Using a judge for anything an `includes()`
can settle would be trading a certainty for a probability.

## What it caught on the first run

Two real bugs, both now fixed and both covered by tests.

**An invented price, and a recommendation that contradicted the stock filter.**
Asked *"¿qué grano tenés que sea frutado y que me lo pueda llevar hoy?"*,
`verGranos` correctly returned only the three beans in stock and excluded the
Nariño. The vector search knew nothing about stock, returned the Nariño's tasting
notes anyway, and the model recommended it at **$18.500** — a price no bean has.
One gap, two failures: the prose arrived without its bean's hard facts, so the
model supplied them. Fixed in migration `0005`: chunks now carry the price and
stock of their bean, from the same `JOIN` that `verGranos` reads.

**A true fact that nothing had provided.** Brumita said *"la bolsa de 250 g sale
$15.500"*. The price was right and grounded; the 250 g was not. It appears
nowhere in any ficha or tool output — only in two code comments — so the model
was reciting a specialty-coffee convention it happened to know. A fact that comes
out right by luck is worse than one that comes out wrong, because it leaves no
symptom. `GRAMOS_POR_BOLSA` now travels with the tools that describe a bean: the
model was going to say it anyway, so now it says it because it read it.

## What the score does not say

**It is 22 questions.** Enough to catch a class of failure, not enough to certify
quality. Fifty with adversarial paraphrases would be worth more.

**Four criteria were rewritten in the same pass that produced the 100%.** They
were badly written, not inconvenient: one demanded the closing time from a
question that only asked when the shop opens, one demanded a bean that had gone
out of stock, and two listed words that had to appear instead of describing what
makes an answer useful. The rule for revising a criterion is in
`tests/casos-evaluacion.ts`, and it is short: a criterion changes because of what
it asks, never because of what it scores. The case that caught the invented price
was left exactly as strict as it was.

**The judge has a measured false-negative rate.** On the first run it failed
three answers that were correct. Twice it keyword-matched the criterion — it
rejected *"bergamota, jazmín y té negro"* because the criterion said "floral,
cítrico" and those two words were absent, which is the same note written better.
Once it rejected a correct price for lacking a `$`. Its prompt now says to judge
meaning and ignore formatting, but a judge shares the blind spots of the family
it judges and tends to reward confident-sounding text. That is exactly why
grounding is not left to one.

## Cost

Two model calls per case, 22 cases, with a four-second gap between them. The gap
is not politeness: the free tier caps at 15 requests per minute, and without it
the run exhausts the quota halfway and the remaining cases fail with a 429 that
reads exactly like a quality failure.

That is also why this is not in CI. A pipeline that goes red because a free tier
ran out teaches people to ignore the pipeline.

## Adding a case

Write the question first, the way somebody standing at the counter would ask it,
and only then look at which tool it belongs to. The other way round produces
questions that confirm the design that already exists.
