# The conformance corpus

Each case is a directory holding `input.md` and `expected.json`. Cases are
grouped by the tier they exercise:

- `canonical/` — the blessed spelling. Producers MUST emit only this; consumers
  MUST parse it.
- `valid/` — non-canonical but valid. Consumers MUST parse it **correctly**;
  producers MUST NOT emit it.
- `invalid/` — consumers MUST salvage what they can and raise the listed
  diagnostics; producers MUST reject it.

`manifest.json` indexes every case. Iterate that rather than globbing the tree —
the check script asserts the two agree, so the manifest is never behind.

## How to run the corpus

**Consumers** parse `input.md`, map their internal model to the shape below with
a **test-only adapter**, and compare. Nothing in production has to emit this
shape; the adapter exists so the corpus does not distort your parser.

**Producers** run it in the opposite direction: given a canonical case, your
serializer must reproduce `input.md` byte-for-byte, and must reject every case
under `invalid/`. A producer never reads `expected.json`.

## `input.md`

Byte-exact. Every file ends with a single trailing newline.

**Do not reformat these files.** `expected.json` holds literal slices of them, so
a formatter that normalizes list markers, wraps a paragraph or strips trailing
whitespace silently invalidates the case. The repository's formatter is
configured to skip this directory; keep it that way.

## `expected.json`

```jsonc
{
  "description": "One line: what this case pins down.",
  "deck": {
    "title": "Deck title",          // string, or null when the file has no `#` heading
    "titleSource": "heading",       // "heading" | "none"
    "frontmatter": { "tags": ["a"] }, // the parsed block, {} when absent
    "fileTags": ["a"],              // tags from frontmatter, after stripping a leading `#`
    "preamble": null                // verbatim slice, or null when there is none
  },
  "cards": [
    {
      "headingText": "The card front",
      "frontBody": "",              // body before the first `***`; "" when there is none
      "back": "- a bullet",         // body after the separator, or the whole body without one
      "cardTags": ["verbs"],        // tags found in this card
      "tags": ["a", "verbs"],       // effective tags: fileTags ∪ cardTags, deduplicated
      "images": [{ "alt": "A tree", "src": "./img/tree.png" }]
    }
  ],
  "diagnostics": [
    { "code": "stray-h1", "cardIndex": null } // cardIndex is null for file-level diagnostics
  ]
}
```

### Rules for the values

- **Text fields are verbatim slices of `input.md`**, normalized only by trimming
  leading and trailing blank lines. They are not re-rendered, re-wrapped or
  HTML-escaped.
- `headingText` is the heading's text content, without the `## ` marker.
- `frontBody` excludes the heading. The specification's "front" is the heading
  plus `frontBody`; they are kept apart here because they are separately
  interesting and separately easy to get wrong.
- `back` is `""` for a card with no body.
- `tags` is the effective set an implementation must end up with. `cardTags` is
  broken out so that a bug in the union is distinguishable from a bug in tag
  scanning.
- `diagnostics` is an unordered set. Compare by `{code, cardIndex}` and **never
  by message text** — messages are each implementation's own. An implementation that also
  reports a source line (`SPEC.md` §8) is not compared on it; this shape has no
  place to put one.

### What is deliberately absent

No rendered HTML, and no AST. Those are the two shapes that would force
implementations to converge on something this format does not govern.
`@ankimd/core`'s Markdown-to-HTML step, for instance, is asserted in that
package's own suite, where it belongs.

## Two diagnostics the corpus cannot cover

`scripts/check-corpus.mjs` reports which codes from the closed list have no
fixture, and two of them are expected to stay that way:

- **`tag-sanitized`** fires when a tag is altered to fit a target model — an Anki
  tag containing `.` or `:`, for instance. Whether it fires depends on the target,
  and `expected.json` has no target side to describe.
- **`unrepresentable-content`** is the catch-all for the no-silent-discard rule,
  which by definition fires at a boundary with a foreign model.

Both are properties of a conversion, not of a Markdown file, so a fixture of this
shape structurally cannot express them. They are asserted in each
implementation's own suite instead. The check script keeps naming them rather
than pretending the list is complete, and that is the intended behaviour, not an
outstanding task.
