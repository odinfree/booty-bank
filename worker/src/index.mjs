import { PrivyClient } from "@privy-io/node";

const ALLOWED_ORIGINS = new Set([
  "https://bootybank.app",
  "https://www.bootybank.app",
  "https://welttowelt.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WALLET_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const FELT_PATTERN = /^0x[0-9a-fA-F]{1,64}$/;
const STARK_FIELD_PRIME = (1n << 251n) + (17n << 192n) + 1n;

export function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export function normalizeFelt(value) {
  if (typeof value !== "string" || !FELT_PATTERN.test(value)) return null;
  try {
    if (BigInt(value) >= STARK_FIELD_PRIME) return null;
  } catch {
    return null;
  }
  return `0x${BigInt(value).toString(16)}`;
}

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(payload, status, origin) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(origin) });
}

async function parseJsonBody(request, maxBytes) {
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { error: "REQUEST TOO LARGE.", status: 413 };
  }

  let text;
  try {
    text = await request.text();
  } catch {
    return { error: "INVALID REQUEST.", status: 400 };
  }
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { error: "REQUEST TOO LARGE.", status: 413 };
  }
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: "INVALID REQUEST.", status: 400 };
  }
}

function readBearerToken(request) {
  const value = request.headers.get("Authorization") ?? "";
  const match = /^Bearer ([^\s]{1,8192})$/.exec(value);
  return match?.[1] ?? null;
}

function createPrivyClient(env) {
  return new PrivyClient({ appId: env.PRIVY_APP_ID, appSecret: env.PRIVY_APP_SECRET });
}

async function authenticatePrivy(request, env, services) {
  if (!env.PRIVY_APP_ID || !env.PRIVY_APP_SECRET) {
    return { error: "PRIVY IS NOT CONFIGURED.", status: 503 };
  }
  const token = readBearerToken(request);
  if (!token) return { error: "AUTHENTICATION REQUIRED.", status: 401 };

  try {
    const client = (services.createPrivyClient ?? createPrivyClient)(env);
    const claims = await client.utils().auth().verifyAccessToken(token);
    if (!claims?.user_id) throw new Error("missing user id");
    return { client, userId: claims.user_id };
  } catch {
    return { error: "INVALID SESSION.", status: 401 };
  }
}

async function walletRecord(env, userId) {
  return env.WAITLIST_DB
    .prepare("SELECT wallet_id, privy_address, public_key FROM privy_starknet_wallets WHERE user_id = ?")
    .bind(userId)
    .first();
}

async function stableIdempotencyKey(userId) {
  const bytes = new TextEncoder().encode(`booty-bank-starknet:${userId}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function publicWallet(record) {
  return {
    walletId: record.wallet_id,
    privyAddress: record.privy_address,
    publicKey: record.public_key,
  };
}

async function handlePrivyWallet(request, env, origin, services) {
  const auth = await authenticatePrivy(request, env, services);
  if (auth.error) return json({ message: auth.error }, auth.status, origin);

  try {
    const existing = await walletRecord(env, auth.userId);
    if (existing) return json(publicWallet(existing), 200, origin);

    const created = await auth.client.wallets().create({
      chain_type: "starknet",
      display_name: "BOOTY BANK STARKNET",
      owner: { user_id: auth.userId },
      idempotency_key: await stableIdempotencyKey(auth.userId),
    });
    if (!created?.id || !created.address || !created.public_key) {
      throw new Error("incomplete wallet response");
    }

    await env.WAITLIST_DB
      .prepare("INSERT INTO privy_starknet_wallets (user_id, wallet_id, privy_address, public_key) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO NOTHING")
      .bind(auth.userId, created.id, created.address, created.public_key)
      .run();

    const stored = await walletRecord(env, auth.userId);
    if (!stored) throw new Error("wallet persistence failed");
    return json(publicWallet(stored), 201, origin);
  } catch {
    return json({ message: "STARKNET WALLET TEMPORARILY UNAVAILABLE." }, 503, origin);
  }
}

async function handlePrivySign(request, env, origin, services) {
  const auth = await authenticatePrivy(request, env, services);
  if (auth.error) return json({ message: auth.error }, auth.status, origin);

  const parsed = await parseJsonBody(request, 4_096);
  if (parsed.error) return json({ message: parsed.error }, parsed.status, origin);
  const walletId = parsed.body?.walletId;
  const hash = normalizeFelt(parsed.body?.hash);
  if (!WALLET_ID_PATTERN.test(walletId ?? "") || !hash) {
    return json({ message: "INVALID SIGNING REQUEST." }, 400, origin);
  }

  try {
    const owned = await env.WAITLIST_DB
      .prepare("SELECT 1 AS owned FROM privy_starknet_wallets WHERE user_id = ? AND wallet_id = ?")
      .bind(auth.userId, walletId)
      .first();
    if (!owned) return json({ message: "WALLET NOT FOUND." }, 404, origin);

    const signed = await auth.client.wallets().rawSign(walletId, { params: { hash } });
    if (!signed?.signature) throw new Error("missing signature");
    return json({ signature: signed.signature }, 200, origin);
  } catch {
    return json({ message: "SIGNING TEMPORARILY UNAVAILABLE." }, 503, origin);
  }
}

async function handleWaitlist(request, env, origin) {
  const parsed = await parseJsonBody(request, 2_048);
  if (parsed.error) {
    const message = parsed.status === 413 ? parsed.error : "SEND A VALID EMAIL.";
    return json({ message }, parsed.status, origin);
  }
  if (parsed.body?.company) return json({ message: "YOU ARE ON THE LIST." }, 200, origin);

  const email = normalizeEmail(parsed.body?.email);
  if (!email) return json({ message: "ENTER A VALID EMAIL." }, 400, origin);
  try {
    await env.WAITLIST_DB
      .prepare("INSERT INTO waitlist_signups (email) VALUES (?) ON CONFLICT(email) DO NOTHING")
      .bind(email)
      .run();
  } catch {
    return json({ message: "WAITLIST TEMPORARILY UNAVAILABLE." }, 503, origin);
  }
  return json({ message: "YOU ARE ON THE LIST." }, 201, origin);
}

export async function handleRequest(request, env, services = {}) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");

  if (url.hostname === "www.bootybank.app") {
    return new Response(null, {
      status: 308,
      headers: {
        "Cache-Control": "public, max-age=3600",
        Location: `https://bootybank.app${url.pathname}${url.search}`,
      },
    });
  }

  const isApiPath = url.pathname === "/api/waitlist" || url.pathname === "/api/wallet/starknet" || url.pathname === "/api/wallet/sign";
  if (!isApiPath) return json({ message: "NOT FOUND." }, 404, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ message: "ORIGIN NOT ALLOWED." }, 403, origin);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return json({ message: "METHOD NOT ALLOWED." }, 405, origin);

  if (url.pathname === "/api/waitlist") return handleWaitlist(request, env, origin);
  if (url.pathname === "/api/wallet/starknet") return handlePrivyWallet(request, env, origin, services);
  return handlePrivySign(request, env, origin, services);
}

export default { fetch: handleRequest };
