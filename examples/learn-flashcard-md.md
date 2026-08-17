---
tags:
  - flashcard-md
---

# Learn Flashcard Markdown

A deck that teaches the format it is written in. Every construct this file uses
is canonical Flashcard Markdown, so it reads two ways: import it into a
flashcard app and study it, or open the source next to `SPEC.md` and see each
rule demonstrated by the line that states it. This paragraph is the *preamble* —
introductory content that belongs to no card.

## What is a deck?

***

An ordinary Markdown file. Frontmatter, a `#` title, and an introductory
preamble are all optional — a deck is just a file whose `##` headings are cards.

## What starts a card, and what ends it?

***

A card begins at a `##` heading and ends at the next heading of depth two or
less, or at the end of the file.

- A blank line **never** ends a card.
- `###` and deeper headings are body content, not card boundaries.

## Where does a card's identity live?

***

In its `##` heading, and nowhere else. Editing the body, the tags, or the front
content below the heading never changes the card's identity — which is what lets
a review tool keep your scheduling history across edits.

That is also why tags must never appear in the heading itself.

## How do you separate a card's front from its back?

This sentence sits *above* the separator, so it is part of the front.

***

Everything after the first `***` line is the back. With no `***` at all, the
entire body is the back.

## Why is the separator `***` and not `---`?

***

In CommonMark, a line of text followed by `---` is a setext heading, so `---`
would change meaning with blank-line placement. `***` always renders as a
horizontal rule. Every other thematic break — `---`, `___`, `* * *`, `****` —
is ordinary content, not a separator.

## What can a card body contain?

***

Arbitrary Markdown, all of which must be preserved:

### Deeper headings like this one

- nested lists
  - like this one
- tables, block quotes, and images too

```text
Code fences as well — a *** in here is content, never a separator.
```

## How does a card get tags?

***

Two levels, unioned. The frontmatter `tags` sequence applies to every card in
the file, and a bare tag like the one on the last line of this card adds to it.
A line consisting solely of tags is metadata: it contributes tags and is not
rendered.

#syntax/tags

## What are the three tiers of input?

***

1. **Canonical** — the single blessed spelling of each construct. Producers
   emit only this.
2. **Valid** — a superset consumers must parse *correctly*, not merely
   tolerate. Producers must not emit it.
3. **Everything else** — salvage the rest of the file, skip the bad unit,
   raise a diagnostic.

## What must a tool never do with content it cannot handle?

***

Discard it silently. A conforming tool degrades and warns — with a stable
diagnostic code such as `unresolved-image` — or it fails loudly. Skipping a
malformed card is allowed only when the tool says so and still reads the rest
of the file.
