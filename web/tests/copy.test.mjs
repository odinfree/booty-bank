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

test("hero display type cannot use collision-prone tracking", async () => {
  const css = await source("../src/app/globals.css");
  const heroRule = css.match(/\.mosby-hero h1\s*\{([^}]+)\}/)?.[1] ?? "";
  const waitlistRule = css.match(/\.waitlist-dossier h2\s*\{([^}]+)\}/)?.[1] ?? "";

  assert.match(heroRule, /letter-spacing:\s*0\s*;/);
  assert.match(heroRule, /line-height:\s*\.86\s*;/);
  assert.match(waitlistRule, /font-size:\s*clamp\(68px,\s*7vw,\s*112px\)/);
  assert.match(waitlistRule, /letter-spacing:\s*0\s*;/);
  assert.doesNotMatch(await source("../src/app/page.tsx"), /INVITATION FILE/);
});

test("the panel-selected deposit-slot mark ships in the favicon and product chrome", async () => {
  const [icon, header, app] = await Promise.all([
    source("../src/app/icon.svg"),
    source("../src/components/site-header.tsx"),
    source("../src/components/bank-app.tsx"),
  ]);

  assert.match(icon, /M32 8A24 24/);
  assert.match(header, /bootybank-mark-cream\.svg/);
  assert.match(app, /bootybank-mark\.svg/);
  assert.doesNotMatch(icon, /#c8ff35/);
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
