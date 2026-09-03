# Documentation

BRUMA is a fictional specialty coffee shop and **Brumita**, a RAG assistant that
answers about the menu and the beans. It exists to show two things that are
usually shown apart: a retrieval system built and understood end to end, and a
frontend with its own visual system.

| Document | What is in it |
|---|---|
| [architecture.md](architecture.md) | The two apps, how a question travels through them, why the split |
| [rag.md](rag.md) | Chunking, embeddings, retrieval, and the calibration behind every number |
| [agent.md](agent.md) | Brumita: the four tools, the prompt, routing, language, guardrails |
| [data.md](data.md) | Schema, master data, the three lifecycles, migrations |
| [frontend.md](frontend.md) | The design system, the hero, the chat surface |
| [operations.md](operations.md) | Running it, Docker, environment, commands, deploying |
| [evals.md](evals.md) | How answer quality is measured, and what the score does not say |
| [decisions.md](decisions.md) | Every decision that was measured, with the numbers |
| [images-credits.md](images-credits.md) | Image provenance and attribution |

## The one thing to read first

Almost every number in this codebase has a measurement behind it, and the
measurement is written in the comment next to it. That is the point of the
project, more than any particular library choice. If you change a number, the
way to justify it is to re-run whatever produced it — usually
`pnpm rag:calibrar`, a `vitest` suite, or `EXPLAIN`.

Three of those measurements overturned something that looked settled:

- The HNSW index **was not being used**, and the query that proved it did not
  resemble the query in production.
- The similarity threshold was calibrated against negatives that were too easy;
  with realistic ones, **no threshold separates the sets**.
- The model fallback made things **worse than the failure it was catching** —
  a 0.7 s question took 67 s.

None of those are visible without measuring. That is the argument for building
this by hand rather than adopting a managed RAG, and it is spelled out in
[decisions.md](decisions.md).
