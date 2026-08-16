# flashcard-md-spec

A specification for writing flashcards in Markdown, and the conformance fixture
corpus that keeps implementations of it honest.

A deck is an ordinary Markdown file. Cards are `##` headings.

```md
---
tags:
  - french
  - verbs
---

# French verbs

## se rendre compte

- to realize, to become aware
- reflexive, takes `de` before a noun
```

- **[`SPEC.md`](./SPEC.md)** — the normative document.
- **[`fixtures/`](./fixtures/README.md)** — the corpus, indexed by
  `fixtures/manifest.json`.

## Why this exists

Five programs grew their own dialect of "flashcards in Markdown" independently,
and the dialects drifted. Two of them disagreed about where a card *ends* — the
one difference that silently destroys a user's review scheduling — and nobody had
noticed, because nothing compared them.

Prose alone would drift again. So the deliverable is the corpus: each
implementation runs the same cases in **its own** test suite, and a disagreement
becomes a failing test in whichever repository is wrong.

## Using it

```bash
pnpm add -D @shbernal/flashcard-md-spec
```

The package contains **no parser** — deliberately. It ships `SPEC.md`,
`fixtures/`, and nothing that runs.

Read [`fixtures/README.md`](./fixtures/README.md) for the case format. In short,
a consumer parses `input.md`, maps its model to the fixture shape through a
**test-only adapter**, and compares; a producer runs the corpus in the opposite
direction, reproducing each canonical `input.md` byte-for-byte and rejecting
everything under `invalid/`.

## Implementations

| Project | Class |
| --- | --- |
| [`pdfanki`](https://github.com/shbernal/pdfanki) | producer |
| [`mdanki`](https://github.com/shbernal/mdanki) | consumer |
| `leitner` | consumer |

A **producer** must emit canonical form only. A **consumer** must parse anything
valid and must never refuse a whole file over one bad card. See `SPEC.md` §3.

## Versioning

`SPEC.md` carries `major.minor`; this package adds the patch digit, so a fixture
typo does not read as a specification revision.

**Any change that can move a card boundary is a major version, without
exception.** Consumers key persistent review state on card identity, so a shifted
boundary silently destroys scheduling history. There is no small boundary change.

## Development

```bash
pnpm install
pnpm run check   # the manifest and the fixture tree agree, and the cases are well formed
pnpm test        # the check script catches the mistakes it is supposed to catch
pnpm run lint
pnpm run format
```

`pnpm run check` is the gate that matters. It verifies that every case on disk is
indexed and vice versa, that every text field in an `expected.json` is a verbatim
slice of its `input.md`, that effective tags really are the union of file and
card tags, and that the manifest's `specVersion` matches what `SPEC.md` declares.

**Never reformat anything under `fixtures/`.** The `expected.json` files hold
literal slices of the `input.md` beside them, so normalizing whitespace or list
markers would silently gut the case. The formatter is configured to skip that
directory; `pnpm run check` will catch it if that ever stops working.

## License

MIT
