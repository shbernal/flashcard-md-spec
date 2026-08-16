/*
 * The check script is the only executable thing in this repository, and its job
 * is to fail. These tests corrupt a copy of the corpus in each of the ways an
 * author actually slips, and assert it notices — a checker that silently passes
 * everything would be worse than none, because the corpus would look verified.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaces = [];

after(() => {
  for (const dir of workspaces) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway copy of the repository, so a corruption cannot escape the test. */
function corpusCopy() {
  const dir = mkdtempSync(join(tmpdir(), "flashcard-md-spec-test-"));
  workspaces.push(dir);
  for (const entry of ["fixtures", "scripts", "SPEC.md"]) {
    cpSync(join(root, entry), join(dir, entry), { recursive: true });
  }
  return dir;
}

/** Runs the checker, returning its exit status and combined output. */
function check(dir) {
  try {
    const stdout = execFileSync(process.execPath, [join(dir, "scripts/check-corpus.mjs")], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output: stdout };
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
}

const editManifest = (dir, mutate) => {
  const path = join(dir, "fixtures/manifest.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  mutate(manifest);
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
};

const editExpected = (dir, id, mutate) => {
  const path = join(dir, "fixtures", id, "expected.json");
  const expected = JSON.parse(readFileSync(path, "utf8"));
  mutate(expected);
  writeFileSync(path, `${JSON.stringify(expected, null, 2)}\n`);
};

test("the corpus as committed passes", () => {
  const result = check(corpusCopy());
  assert.ok(result.ok, result.output);
  assert.match(result.output, /corpus ok/);
});

test("catches a case on disk that the manifest does not list", () => {
  const dir = corpusCopy();
  editManifest(dir, (m) => {
    m.cases = m.cases.filter((c) => c.id !== "canonical/minimal-deck");
  });

  const result = check(dir);
  assert.ok(!result.ok);
  assert.match(result.output, /missing from manifest\.json/);
});

test("catches a manifest entry with no directory", () => {
  const dir = corpusCopy();
  editManifest(dir, (m) => {
    m.cases.push({ id: "valid/does-not-exist", tier: "valid", description: "x", diagnostics: [] });
  });

  const result = check(dir);
  assert.ok(!result.ok);
  assert.match(result.output, /not on disk/);
});

test("catches a text field that is not a verbatim slice of input.md", () => {
  const dir = corpusCopy();
  editExpected(dir, "canonical/minimal-deck", (e) => {
    e.cards[0].back = "- to realise, to become aware";
  });

  const result = check(dir);
  assert.ok(!result.ok);
  assert.match(result.output, /not a verbatim slice/);
});

test("catches effective tags that are not the union of file and card tags", () => {
  const dir = corpusCopy();
  editExpected(dir, "canonical/file-and-card-tags", (e) => {
    e.cards[0].tags = ["grammar/mood"];
  });

  const result = check(dir);
  assert.ok(!result.ok);
  assert.match(result.output, /is not fileTags/);
});

test("catches a diagnostic code outside the closed list", () => {
  const dir = corpusCopy();
  editExpected(dir, "invalid/stray-h1", (e) => {
    e.diagnostics = [{ code: "invented-code", cardIndex: null }];
  });
  editManifest(dir, (m) => {
    m.cases.find((c) => c.id === "invalid/stray-h1").diagnostics = ["invented-code"];
  });

  const result = check(dir);
  assert.ok(!result.ok);
  assert.match(result.output, /not in the closed list/);
});

test("catches a canonical case that expects a diagnostic", () => {
  const dir = corpusCopy();
  editExpected(dir, "canonical/minimal-deck", (e) => {
    e.diagnostics = [{ code: "stray-h1", cardIndex: null }];
  });
  editManifest(dir, (m) => {
    m.cases.find((c) => c.id === "canonical/minimal-deck").diagnostics = ["stray-h1"];
  });

  const result = check(dir);
  assert.ok(!result.ok);
  assert.match(result.output, /must not expect diagnostics/);
});

test("catches an invalid case that expects none", () => {
  const dir = corpusCopy();
  editExpected(dir, "invalid/stray-h1", (e) => {
    e.diagnostics = [];
  });
  editManifest(dir, (m) => {
    m.cases.find((c) => c.id === "invalid/stray-h1").diagnostics = [];
  });

  const result = check(dir);
  assert.ok(!result.ok);
  assert.match(result.output, /must expect at least one diagnostic/);
});

test("catches a manifest specVersion that has drifted from SPEC.md", () => {
  const dir = corpusCopy();
  editManifest(dir, (m) => {
    m.specVersion = "9.9";
  });

  const result = check(dir);
  assert.ok(!result.ok);
  assert.match(result.output, /SPEC\.md declares/);
});

test("catches a diagnostic pointing at a card that does not exist", () => {
  const dir = corpusCopy();
  editExpected(dir, "invalid/unresolved-image", (e) => {
    e.diagnostics = [{ code: "unresolved-image", cardIndex: 7 }];
  });

  const result = check(dir);
  assert.ok(!result.ok);
  assert.match(result.output, /has no such card/);
});
