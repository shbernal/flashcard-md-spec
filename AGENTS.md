# Local Agent Guide

## Project Scope

- this repository holds a specification and a conformance fixture corpus, and
  **no runtime code**
- `SPEC.md` is normative prose; `fixtures/` is the normative corpus; they are
  expected to agree, and a disagreement is a bug reported here rather than
  worked around downstream
- the only executable thing is `scripts/check-corpus.mjs`, which validates the
  corpus — it is not a parser and must not grow into one
- published as `@shbernal/flashcard-md-spec` so implementations can depend on it

## The One Rule That Breaks Everything

**Never reformat, rewrap, or normalize anything under `fixtures/`.**

Each `expected.json` holds literal substrings of the `input.md` beside it. A
formatter that changes a list marker, wraps a paragraph, or strips trailing
whitespace turns a case into one that asserts nothing, and it does so silently.

- `.oxfmtrc.json` lists `fixtures/**` and `SPEC.md` in `ignorePatterns`
- the `format` script also names its paths explicitly rather than relying on that
- `pnpm run check` verifies every text field is still a verbatim slice, so a slip
  fails rather than rots

## Behavior Guardrails

- do not add a parser, a conformance runner, or any dependency that parses
  Markdown — each implementation runs the corpus in its own suite, and that
  separation is the whole mechanism
- do not add a diagnostic code without adding it to the closed list in `SPEC.md`
  §8, to `manifest.json`, and — where the corpus can express it — to a fixture
- two codes (`tag-sanitized`, `unrepresentable-content`) intentionally have no
  fixture because they describe a conversion boundary rather than a Markdown
  file; the check script naming them is expected output, not a to-do
- `fixtures/manifest.json` is generated in practice but committed as source;
  regenerate it whenever a case is added, renamed or re-described

## Changing the Specification

- a change that **can move a card boundary is always a major version**, with no
  exception, because consumers key review scheduling on card identity
- a new optional key, or a meaning assigned to something version 1 leaves
  unspecified, is a minor
- a fixture addition or an editorial fix is a patch, and patches live in the
  package version only — `SPEC.md` carries `major.minor`
- `scripts/check-corpus.mjs` asserts that `manifest.json`'s `specVersion` matches
  the `**Version X.Y**` line in `SPEC.md`, so bump both together

## Validation Workflow

- `pnpm install --frozen-lockfile`
- `pnpm run check` (the gate that matters)
- `pnpm test`
- `pnpm run lint`
- `pnpm run format`
- `npm pack --dry-run --ignore-scripts` before anything release-shaped

## Release Workflow

- **the first npm publish is Santiago's**, by hand: trusted publishing has
  nothing to attach to until the package exists
- afterwards, releases follow the sibling repositories' pattern — a tag-triggered
  `.github/workflows/publish.yml`
- ask before creating tags, GitHub releases, or publishing

## Documentation Expectations

- when a rule changes, `SPEC.md`, the corpus, and `README.md` move together
- keep the reason in the text. Most rules here exist because an implementation
  got it wrong once, and the reason is what stops it being "simplified" back
