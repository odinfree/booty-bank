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

test("Fable layout directives and sticky behavior stay locked", async () => {
  const [css, header, modalHook, waitlist] = await Promise.all([
    source("../src/app/globals.css"),
    source("../src/components/site-header.tsx"),
    source("../src/hooks/use-modal-focus.ts"),
    source("../src/components/waitlist-form.tsx"),
  ]);

  assert.match(css, /main\s*\{[^}]*overflow:\s*clip/);
  assert.match(css, /\.site-wordmark img\s*\{[^}]*width:\s*40px;[^}]*height:\s*40px/);
  assert.match(css, /\.hero-bottomline p\s*\{[^}]*font-size:\s*clamp\(28px,\s*4\.5vw,\s*64px\)/);
  assert.ok(css.includes(".pq-declaration h2 { font-size: clamp(42px, 11.6vw, 66px)"));
  assert.match(header, /width="40" height="40"/);
  assert.match(header, /className="site-cta" href="\/app\/">OPEN APP/);
  assert.match(await source("../src/app/page.tsx"), /className="hero-status".*WORKING PROTOTYPE/);
  assert.match(css, /\.site-cta:focus-visible, \.pq-declaration a:focus-visible \{ outline-color: var\(--blue\)/);
  assert.match(css, /\.file-green \.file-tab, \.file-green > strong \{ color: var\(--ink\)/);
  assert.match(css, /\.dossier-form input::placeholder \{ color: var\(--ink\); opacity: 1/);
  assert.match(css, /\.site-header nav \{ grid-column: 1 \/ -1; grid-row: 2; display: flex/);
  assert.match(modalHook, /event\.key === "Escape"/);
  assert.match(modalHook, /event\.key !== "Tab"/);
  assert.doesNotMatch(waitlist, /name="company"/);
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

test("Privy social login is live only when configured and otherwise stays an honest preview", async () => {
  const [control, placeholder, providers] = await Promise.all([
    source("../src/components/starknet-wallet-control.tsx"),
    source("../src/components/privy-placeholder.tsx"),
    source("../src/components/app-providers.tsx"),
  ]);

  assert.match(control, /<PrivyPlaceholder \/>/);
  assert.match(placeholder, /SOCIAL LOGIN/);
  assert.match(placeholder, /GOOGLE/);
  assert.match(placeholder, /EMAIL/);
  assert.match(placeholder, /NO ACCOUNT CREATED/);
  assert.match(placeholder, /getAccessToken/);
  assert.match(placeholder, /CREATE STARKNET ACCOUNT/);
  assert.match(placeholder, /ACCOUNT NOT DEPLOYED/);
  assert.match(providers, /<PrivyProvider/);
  assert.match(providers, /loginMethods: \["google", "email"\]/);
  assert.match(providers, /return children/);
  assert.doesNotMatch(control, /executeSwap/);
});

test("the account opens in standard mode and private mode is opt-in", async () => {
  const app = await source("../src/components/bank-app.tsx");

  assert.match(app, /const \[privateMode, setPrivateMode\] = useState\(false\)/);
  assert.match(app, /privateMode \? "PRIVATE" : "STANDARD"/);
  assert.doesNotMatch(app, /privateMode \? "PRIVATE" : "VISIBLE"/);
  assert.doesNotMatch(app, /app-redacted/);
  assert.match(app, /privateMode \? "AMOUNT HIDDEN" : "\+\$6,142\.10 THIS MONTH \/ \+27\.4%"/);
  assert.match(app, /privateMode \? "••••" : "−\$1,250"/);
  assert.match(app, /SEND SAMPLE PAYMENT/);
  assert.match(app, /ILLUSTRATIVE SCORE/);
});

test("landing keeps the prototype claim boundaries", async () => {
  const [footer, accountPage] = await Promise.all([
    source("../src/components/site-footer.tsx"),
    source("../src/app/app/page.tsx"),
  ]);

  for (const boundary of [
    "SAMPLE BANKING DATA",
    "WALLET ACTIONS REQUIRE APPROVAL",
    "NO ISSUED ACCOUNTS, CARDS, CREDIT, OR INVESTMENTS",
    "NOT A BANK",
    "NOT AFFILIATED WITH ONLYFANS",
  ]) {
    assert.ok(footer.includes(boundary), `Missing claim boundary: ${boundary}`);
  }
  assert.match(accountPage, /LIVE WALLET ACTIONS REQUIRE APPROVAL/);
  assert.doesNotMatch(accountPage, /NO FUNDS MOVE/);
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
