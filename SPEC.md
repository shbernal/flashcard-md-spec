# Flashcard Markdown

**Version 1.1**

A specification for writing flashcards in Markdown files.

A deck is an ordinary Markdown document. Cards are `##` headings. That is nearly
the whole format; the rest of this document exists so that independent
implementations agree on the cases where "nearly" is not good enough.

## Status of this document

Version 1.1. The conformance corpus in `fixtures/` is normative alongside this
prose: where the two disagree, that is a bug in one of them, and it is reported
against this repository rather than resolved locally by an implementation.

## 1. Conventions

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted
as described in RFC 2119.

Throughout, *deck* means one Markdown file, and *card* means one `##` section
within it.

## 2. Compatibility targets

Three external systems constrain this format, and they constrain it in different
ways. The distinction is load-bearing, and an implementation that has to choose
between them resolves the conflict in this order.

1. **CommonMark — respected absolutely.** A deck is a Markdown file. Nothing in
   this specification requires a parser to violate CommonMark, and nothing here
   assigns a meaning to syntax that CommonMark already defines.
2. **Obsidian — compatibility of the file, and correct rendering.** Decks are
   likely to live inside an Obsidian vault. Where Obsidian defines a syntax this
   format needs, **Obsidian's definition is adopted rather than a new one
   invented**, and a conforming deck MUST render sensibly in Obsidian's reading
   view. Where this format is finer-grained than Obsidian, the refinement MUST be
   non-conflicting: Obsidian may see less structure than a conforming consumer
   does, but it MUST NOT see something broken.
3. **Anki — fidelity, not correspondence.** Anki's note model is HTML-based, so
   exact round-tripping is not achievable and chasing it would distort the
   format. The target is to preserve as much meaning as the Markdown form can
   carry. Where fidelity cannot be preserved, the failure mode MUST be
   degradation plus a diagnostic — never a hard failure. Lossy is acceptable;
   refusing to convert is not.

Where 2 and 3 pull in opposite directions, **2 wins for the Markdown file** —
that is where the file lives and is edited — and 3 is satisfied by a documented
mapping at the conversion boundary. The tag hierarchy in §6.5 is the worked
example.

## 3. Conformance

### 3.1 Classes

An implementation conforms as a **producer**, a **consumer**, or both. The class
is a role, not a dialect: both classes implement the same grammar, and differ
only in what they are obliged to do with input that departs from it.

| Class | Obligation |
| --- | --- |
| **Producer** | MUST emit canonical form only. SHOULD fail loudly rather than emit non-canonical output. |
| **Consumer** | MUST correctly parse anything valid. MUST NOT refuse to load a file because one card is malformed. |

### 3.2 Tiers

The grammar defines three tiers of input.

1. **Canonical** — the single blessed spelling of each construct. Producers MUST
   emit only this. Consumers MUST parse it.
2. **Valid** — a superset of canonical. Consumers MUST parse it **correctly**,
   not merely tolerate it. Producers MUST NOT emit it.
3. **Everything else** — consumers MUST salvage what they can, skip what they
   cannot, and surface a diagnostic. Producers reject it.

"Degrade gracefully" is otherwise unfalsifiable, so tier 3 is defined
concretely: **salvage the rest of the file, skip the bad unit, say so.** Never
refuse the whole file; never drop anything in silence.

Each rule below states its tier where the tiers differ. A rule with no tier note
is the same at every tier.

### 3.3 The no-silent-discard rule

This rule is orthogonal to class. It applies wherever data crosses between the
Markdown and a **foreign model** this specification does not govern — a PDF or
EPUB being converted from, Anki's HTML fields, a terminal renderer.

> An implementation MUST NOT silently discard content it cannot represent. It
> degrades and warns, or it fails loudly. Silence is never conformant.

It is deliberately not a third class. An implementation holds a class *and* sits
on a boundary; making the boundary a class would force a choice between the two.

This is the single most violated rule in the implementations this format was
drawn from — every defect found while writing it was an instance, and not one had
been reported by a user. Content that vanishes produces no bug report.

## 4. Document structure

A deck is:

```
[YAML frontmatter]
[# Deck title]
[preamble]
[card]*
```

Every part is optional except that a file with no cards is a deck with no cards,
not an error.

### 4.1 Frontmatter

An optional YAML frontmatter block, delimited by `---`, MUST be the first thing
in the file if present.

This specification defines exactly one frontmatter key: `tags` (§6.4). It
reserves the right to define further keys in later versions.

**Keys this specification does not define are user extensions and are legal.** A
consumer:

- MUST NOT treat an unknown key as an error,
- MUST ignore keys it does not understand,
- MUST preserve them if it rewrites the file.

The last point is a requirement, not a courtesy: a tool that rewrites a deck and
drops a user's key is a silent-discard defect under §3.3.

Note that the key namespace is flat, so a key a user has chosen may collide with
a key a later version of this specification defines. That is the acknowledged
cost of leaving the namespace open, and it is accepted because the space is
inert: unknown keys carry no parsing consequence, cannot move a card boundary,
and cannot change what a card contains. The body grammar, by contrast, is closed.
A future key that wants *behaviour* is a specification version, not a key.

### 4.2 Deck title

An optional `#` heading below the frontmatter is the deck title.

A consumer that needs a deck name and finds no `#` heading MAY fall back to the
filename. That fallback is permitted, not required, and its absence is not an
error.

### 4.3 Preamble

Content between the deck title and the first `##` heading is the **preamble**. It
is legal — a deck may carry an introductory paragraph — and it **belongs to no
card**.

A consumer MAY drop the preamble without a diagnostic. This is the one place
where dropping content is conformant, and the reason is that the preamble is
*specified* non-card content rather than content the consumer failed to
represent. §3.3 does not apply to it.

## 5. Cards

### 5.1 Boundaries

> A card begins at a `##` heading. A card ends at the next heading of depth ≤ 2,
> or at end of file.

Consequences, each of which an implementation has got wrong at least once:

- A `#` heading in the middle of a file **ends the card before it**. Content
  between that `#` and the next `##` belongs to no card.
- A `###` or deeper heading is **card body content**. It does not start or end a
  card.
- A blank line **never** ends a card. Neither does any other blank-line
  arrangement, a thematic break, or the end of a list.

A second `#` heading has **no defined meaning in version 1**. Consumers SHOULD
raise `stray-h1` and MUST NOT treat it as card content. The boundary is fixed now
because a boundary can never be corrected cheaply — see §9 — while the *meaning*
is deliberately left unassigned, so that assigning one later is additive.

### 5.2 Card identity

The `##` heading is mandatory and is the sole source of a card's identity.

Consumers that persist per-card state across runs — review scheduling, most
importantly — key it on the heading, not the body. This specification does not
mandate a key derivation, but it does guarantee the property that makes one
possible:

> Editing a card's body, its tags, or its front content below the heading MUST
> NOT change the card's identity.

This is why tags may not appear in the `##` heading (§6.3). A tag there would
change the heading text, change the identity, and silently orphan that card's
review history.

### 5.3 Front and back

> The front is the `##` heading plus any body content before the first `***`.
> Everything after the `***` is the back. With no `***`, the entire body is the
> back.

The separator is recognized as follows:

> A line consisting of exactly `***`, at the top level of the card body — not
> indented into a list item, not inside a blockquote, not inside a fenced or
> indented code block. The **first** such line divides front from back; later
> ones are ordinary back content.

Other thematic breaks — `---`, `___`, `* * *`, `****` — are content, not
separators. Two implementation notes follow from this, and both are mistakes that
have been made:

- A parser working from an abstract syntax tree sees a thematic-break node and
  **cannot tell which characters produced it**. It MUST check the source text.
  Otherwise `---` silently becomes a separator.
- A parser working from raw text by regular expression MUST track fenced-code
  state, or a `***` inside a code fence splits the card mid-fence.

`***` is the separator rather than `---` because in CommonMark a text line
followed by `---` is a setext heading, not a thematic break; making card
semantics depend on blank-line placement would be exactly the fragility this
format rejects elsewhere. `***` has no setext meaning and always renders as a
horizontal rule, which is apt for a front/back divider.

**Canonical:** a blank line either side of the `***`. **Valid:** neither is
required.

### 5.4 Body content

The card body is **arbitrary Markdown**. Paragraphs, nested lists, code fences,
tables, block quotes and images are all body content and MUST be preserved.

A bullet list is the conventional way to write a back, and producers may enforce
that on their own output, but it is an authoring convention and not a grammar
rule. In particular, nested list items are ordinary CommonMark and MUST NOT be
dropped.

**Canonical:** a blank line after the `##` heading, before the body. **Valid:**
no blank line. Both parse identically; the canonical form is chosen because
markdownlint's MD022 requires blank lines around headings, and the alternative
would make every conforming deck lint-dirty inside a vault the user also lints.

### 5.5 Degenerate cards

> A card with a front and no body is **valid**. Duplicate `##` fronts within one
> file are **valid**.

A consumer MUST accept both. An Anki note with an empty field is legitimate, and
refusing a file over a duplicate heading is exactly what §3.1 forbids a consumer
to do.

Producers MAY refuse to *emit* either — a producer validating its own generated
output is applying a role policy, not a grammar rule.

Note for implementations that write Anki packages: Anki identifies a note by its
content, so two cards identical in **both** front and back become one note
whatever the file says. That is a property of Anki, not of this format. Such an
implementation MUST raise a diagnostic rather than let the count silently drop.
Cards that share only a front are unaffected.

## 6. Tags

### 6.1 Semantics

> The effective tags of a card are the file-level tags ∪ the card-level tags,
> deduplicated.

Union, not override. This matches both Anki's and Obsidian's set model. Nothing
else about tag semantics is normative — which level *means* what is an authoring
convention, and this specification deliberately does not define one.

### 6.2 Tag grammar

Obsidian's tag grammar is adopted verbatim:

- allowed characters are alphanumerics (Unicode included), `_`, `-`, and `/`
- a tag MUST contain at least one non-numeric character
- `/` is the nesting separator

The "at least one non-numeric" clause excludes `#42` while still admitting
`#1st-declension`. Because `#` must be followed immediately by a valid token,
`C#` (trailing `#`) and `#include <stdio.h>` (contains `<`) are also excluded
without a special case.

Tags are not recognized inside code spans or fenced code blocks, which is also
Obsidian's behaviour.

### 6.3 Card-level tags

A card-level tag is a bare `#tag` in the card body — `#` immediately followed by
the token, no space.

**Canonical:** tags on their own line at the end of the card body. **Valid:**
anywhere in the card, **including the front region**. The card is the unit that
carries tags; the `***` split decides which Anki field content lands in, not
which region tags count in. Restricting tags to the back would mean a tag written
above the `***` renders as front content *and* vanishes as a tag — silently,
which §3.3 forbids.

Tags MUST NOT appear in the `##` heading. See §5.2 for why: it would destroy
review history.

**Rendering** is line-based, not token-based:

> A line whose content consists solely of tags is metadata: it contributes tags
> and MUST NOT be rendered. A tag embedded in other content contributes tags and
> MUST be rendered as written.

The token-based alternative — hide every recognized tag — fails compatibility
target 2, because Obsidian renders inline tags visibly, and it mangles prose:
"The #verbs group is…" would render as "The group is…".

### 6.4 File-level tags

> File-level tags are the frontmatter key `tags`, whose value MUST be a YAML
> block sequence. A leading `#` on a frontmatter tag is accepted and stripped.

```yaml
---
tags:
  - verbs
  - french/grammar
---
```

A `tags` value that is not a block sequence MUST NOT be read as tags, and MUST
raise `frontmatter-tags-not-a-sequence`. The same applies to the key `tag`.

Both restrictions come from compatibility target 2 rather than from taste:
Obsidian removed the `tag` alias and stopped accepting a scalar string for `tags`
in version 1.9. Accepting either here would no longer be *matching* Obsidian but
being more permissive than it, which would mean a user's vault and their
flashcard tools disagree about the same file — the vault showing no tags at all.
The diagnostic is what keeps that from happening quietly.

Block sequence is canonical rather than flow style because Obsidian's property
editor rewrites frontmatter into block sequences; choosing flow style would mean
Obsidian de-canonicalizes the user's file the first time they touch its
properties.

Note that accepting a further shape in a later version is additive, and therefore
cheap. Retracting one would be breaking. Strictness here is the reversible
direction.

### 6.5 Anki tag mapping

Anki nests tags with `::` where this format nests with `/`.

> `/` in the file ⇄ `::` in Anki. Implementations translate on export and on
> import.

An Anki tag containing characters Obsidian disallows — `.`, `:`, `+`, and so on —
is the standing lossy case. An importer **sanitizes and raises `tag-sanitized`;
it MUST NOT fail.** This is compatibility target 3 in action.

Version 1 has an implementation of the export direction only. Both directions are
stated because it is one mapping, and writing down half of a mapping is how the
other half gets reinvented incorrectly.

## 7. Images

Images are ordinary CommonMark. Both **local relative paths** and **absolute
URLs** are legal; this specification does not restrict a link destination.

A relative path resolves against the **deck file's directory**.

Alt text is **SHOULD, not MUST**. `![](image.png)` is valid; consumers MUST NOT
require alt text, and producers SHOULD emit it. A consumer that uses alt text as
a label degrades to an unlabeled attachment without it — a quality loss, not a
parse failure, which is what makes SHOULD the right strength here.

A consumer that cannot resolve or display an image MUST raise `unresolved-image`
rather than omit it silently.

## 8. Diagnostics

Diagnostics have **stable codes and free-form messages**. Conformance is asserted
against the code; message text is an implementation's own.

The version 1 code list is closed:

| Code | Raised when |
| --- | --- |
| `stray-h1` | A second `#` heading appears in the file (§5.1). |
| `frontmatter-tags-not-a-sequence` | `tags` is present but not a block sequence, or the removed `tag` key is present (§6.4). |
| `preamble-tag` | A bare `#tag` appears in the preamble, where version 1 gives it no meaning. |
| `tag-sanitized` | A tag was altered to fit the target model (§6.5). |
| `unresolved-image` | An image could not be resolved or displayed (§7). |
| `malformed-card-skipped` | A tier-3 unit was skipped so the rest of the file could be read (§3.2). |
| `unrepresentable-content` | Catch-all for §3.3. Carries a free-form `detail`. |

### Where a diagnostic points

`cardIndex` is the card the diagnostic belongs to, or `null` when it is
file-level. That is the only location version 1 requires, and `{code, cardIndex}`
is what the corpus compares.

An implementation MAY also carry `line`: the 1-based line of the source file
where the departure begins, counted from the first line of the file, frontmatter
included. It is absent rather than `0` or `null` where there is no such line.
`tag-sanitized` and `unrepresentable-content` are raised at a conversion boundary
(§6.5, §3.3), about a value rather than about a place in a file.

Naming the field here is what stops four implementations from inventing four
spellings of it. It is not a requirement: a consumer that omits `line` conforms,
and the corpus does not assert it either way. Where a producer's error message
points is a quality-of-implementation matter, and nothing in a Markdown file can
be compared against it.

**Severity is a function of conformance class, not a property of the code.** The
same code is an error for a producer and a warning for a consumer. That is §3.1's
split expressed once rather than duplicated across every case.

## 9. Versioning

This document carries `major.minor`. The npm package adds a patch digit, so a
fixture typo does not read as a specification revision.

| Change | Bump |
| --- | --- |
| Any grammar change that **can move a card boundary** | major |
| Any other grammar change | major |
| A new optional key, or a meaning assigned to something version 1 leaves unspecified | minor |
| A fixture addition, an editorial fix | patch |

**Card-boundary changes are always major, without exception.** Consumers key
persistent review state on card identity (§5.2), so a change that shifts a
boundary silently destroys a user's scheduling history. There is no
"small" boundary change.

`fixtures/manifest.json` carries a `specVersion` field so that an implementation
pins the version it conforms to rather than tracking whatever it last installed.

## 10. The fixture corpus

`fixtures/` holds the conformance corpus, indexed by `fixtures/manifest.json`.
Prose drifts — five independent implementations of this format proved that before
it was written — so the corpus, not this document, is the mechanism that keeps
implementations aligned.

Cases are grouped by tier: `fixtures/canonical/`, `fixtures/valid/`,
`fixtures/invalid/`. Each case is a directory holding `input.md` and
`expected.json`.

`expected.json` holds **verbatim substrings of the source**, not an abstract
syntax tree. Fields are exact slices of `input.md`, normalized only by trimming
leading and trailing blank lines. This is the one level of abstraction that a
line scanner, an AST pipeline and an HTML emitter can all assert against; an AST
would force two of those three to adopt the third's model, and rendered HTML
would force all three to agree on rendering, which is not a format question.

Two consequences make the corpus safe to adopt:

- **Implementations write a test-only adapter** from their internal model to this
  shape. Nothing in production has to emit `expected.json`.
- **Producers use the corpus in the opposite direction.** Given a canonical case,
  a producer's serializer must reproduce `input.md` byte-for-byte, and must
  reject every invalid case. A producer never parses `expected.json`.

See `fixtures/README.md` for the file format.
