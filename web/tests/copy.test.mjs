import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) => readFile(new URL(path, import.meta.url), "utf8");

test("landing shows the prototype status once", async () => {
  const [page, header] = await Promise.all([
    source("../src/app/page.tsx"),
    source("../src/components/site-header.tsx"),
  ]);
  const matches = `${page}\n${header}`.match(/WORKING PROTOTYPE/g) ?? [];

  assert.equal(matches.length, 1);
});

test("landing file headlines stay short", async () => {
  const page = await source("../src/app/page.tsx");
  const fileCopies = [...page.matchAll(/copy: "([^"]+)"/g)].map((match) => match[1]);

  assert.ok(fileCopies.length >= 3);
  for (const copy of fileCopies) {
    assert.ok(copy.split(/\s+/).length <= 4, `File headline is too long: ${copy}`);
  }
});

test("landing keeps the prototype claim boundaries", async () => {
  const footer = await source("../src/components/site-footer.tsx");

  for (const boundary of [
    "DEMO ONLY",
    "SAMPLE DATA",
    "NO ACCOUNTS, CARDS, CREDIT, OR INVESTMENTS",
    "NOT A BANK",
    "NOT AFFILIATED WITH ONLYFANS",
  ]) {
    assert.ok(footer.includes(boundary), `Missing claim boundary: ${boundary}`);
  }
});

test("visible product copy avoids the rejected long slogans", async () => {
  const files = await Promise.all([
    source("../src/app/page.tsx"),
    source("../src/app/credit/page.tsx"),
    source("../src/app/privacy/page.tsx"),
    source("../src/components/bank-app.tsx"),
  ]);
  const copy = files.join("\n");

  for (const rejected of [
    "EVERY CARD. ONE CONTROL ROOM.",
    "EVERY DOLLAR HAS A JOB.",
    "GET PAID. STAY PRIVATE. GROW.",
    "SHARE THE MINIMUM. SEE EVERY ACCESS.",
    "THE REST. OUT OF THE WAY.",
  ]) {
    assert.equal(copy.includes(rejected), false, `Rejected copy returned: ${rejected}`);
  }
  assert.equal(copy.includes("—"), false, "Visible copy contains an em dash");
});
