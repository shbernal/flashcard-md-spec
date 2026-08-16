#!/usr/bin/env node
/*
 * Keeps the corpus honest. This is deliberately not a conformance runner — no
 * parser lives in this repository, because each implementation runs the corpus
 * in its own suite and that is the whole mechanism. What this checks is that the
 * corpus itself is well formed and that the manifest describes the tree it
 * actually sits in, since a stale index is the failure that would let an
 * implementation quietly skip cases.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(root, "fixtures");
const TIERS = ["canonical", "valid", "invalid"];

const problems = [];
const fail = (where, message) => problems.push(`${where}: ${message}`);

const manifest = JSON.parse(readFileSync(join(fixtures, "manifest.json"), "utf8"));
const codes = new Set(manifest.diagnosticCodes);

/* The spec version in the manifest is what implementations pin against, so it
   has to match the version SPEC.md declares rather than drift beside it. */
const specHeading = readFileSync(join(root, "SPEC.md"), "utf8").match(/^\*\*Version (.+?)\*\*$/m);
if (!specHeading) {
  fail("SPEC.md", "no `**Version X.Y**` line found");
} else if (specHeading[1] !== manifest.specVersion) {
  fail(
    "fixtures/manifest.json",
    `specVersion ${manifest.specVersion} but SPEC.md declares ${specHeading[1]}`,
  );
}

const onDisk = TIERS.flatMap((tier) =>
  readdirSync(join(fixtures, tier))
    .filter((name) => statSync(join(fixtures, tier, name)).isDirectory())
    .map((name) => `${tier}/${name}`),
).sort();

const indexed = manifest.cases.map((entry) => entry.id).sort();

for (const id of onDisk) {
  if (!indexed.includes(id)) fail(id, "on disk but missing from manifest.json");
}
for (const id of indexed) {
  if (!onDisk.includes(id)) fail(id, "in manifest.json but not on disk");
}

/* A slice that does not literally occur in input.md is the authoring slip this
   format invites, and it would turn a case into one that asserts nothing. */
const assertSlice = (id, field, value, source) => {
  if (value === null || value === "") return;
  if (!source.includes(value)) {
    fail(id, `${field} is not a verbatim slice of input.md`);
  }
};

for (const entry of manifest.cases) {
  const dir = join(fixtures, entry.id);
  if (!onDisk.includes(entry.id)) continue;

  const source = readFileSync(join(dir, "input.md"), "utf8");
  const expected = JSON.parse(readFileSync(join(dir, "expected.json"), "utf8"));

  if (!source.endsWith("\n") || source.endsWith("\n\n")) {
    fail(entry.id, "input.md must end with exactly one newline");
  }

  if (expected.description !== entry.description) {
    fail(entry.id, "description differs between expected.json and manifest.json");
  }

  const { deck } = expected;
  assertSlice(entry.id, "deck.title", deck.title, source);
  assertSlice(entry.id, "deck.preamble", deck.preamble, source);

  if (deck.title === null && deck.titleSource !== "none") {
    fail(entry.id, "deck.title is null but titleSource is not 'none'");
  }
  if (deck.title !== null && deck.titleSource === "none") {
    fail(entry.id, "deck.title is set but titleSource is 'none'");
  }

  expected.cards.forEach((card, index) => {
    const where = `${entry.id} card ${index}`;
    assertSlice(where, "headingText", card.headingText, source);
    assertSlice(where, "frontBody", card.frontBody, source);
    assertSlice(where, "back", card.back, source);

    /* Effective tags are file ∪ card, deduplicated. Getting this wrong in a
       fixture would teach every implementation the wrong union. */
    const union = [...new Set([...deck.fileTags, ...card.cardTags])].sort();
    const declared = [...card.tags].sort();
    if (JSON.stringify(union) !== JSON.stringify(declared)) {
      fail(
        where,
        `tags ${JSON.stringify(declared)} is not fileTags ∪ cardTags ${JSON.stringify(union)}`,
      );
    }

    for (const image of card.images) {
      if (!source.includes(image.src)) fail(where, `image src ${image.src} is not in input.md`);
    }
  });

  for (const diagnostic of expected.diagnostics) {
    if (!codes.has(diagnostic.code)) {
      fail(entry.id, `diagnostic code '${diagnostic.code}' is not in the closed list`);
    }
    if (diagnostic.cardIndex !== null && !expected.cards[diagnostic.cardIndex]) {
      fail(entry.id, `diagnostic cardIndex ${diagnostic.cardIndex} has no such card`);
    }
  }

  const declaredCodes = [...new Set(expected.diagnostics.map((d) => d.code))].sort();
  if (JSON.stringify(declaredCodes) !== JSON.stringify(entry.diagnostics)) {
    fail(entry.id, "diagnostic codes differ between expected.json and manifest.json");
  }

  if (entry.tier === "invalid" && declaredCodes.length === 0) {
    fail(entry.id, "an invalid case must expect at least one diagnostic");
  }
  if (entry.tier !== "invalid" && declaredCodes.length > 0) {
    fail(entry.id, `a ${entry.tier} case must not expect diagnostics`);
  }
}

/* Every code in the closed list needs a case, or the list is aspirational. */
const exercised = new Set(manifest.cases.flatMap((entry) => entry.diagnostics));
const unexercised = manifest.diagnosticCodes.filter((code) => !exercised.has(code));

if (problems.length > 0) {
  console.error(`${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`corpus ok: ${manifest.cases.length} cases, spec ${manifest.specVersion}`);
if (unexercised.length > 0) {
  console.log(`  no fixture yet for: ${unexercised.join(", ")}`);
}
