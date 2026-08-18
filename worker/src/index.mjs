import { PrivyClient } from "@privy-io/node";

const PUBLIC_ORIGINS = new Set([
  "https://bootybank.app",
  "https://www.bootybank.app",
  "https://welttowelt.github.io",
]);
const LOCAL_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const AVNU_SEPOLIA_PAYMASTER_URL = "https://sepolia.paymaster.avnu.fi";
const STARK_FIELD_PRIME = (BigInt(2) ** BigInt(251)) + (BigInt(17) * (BigInt(2) ** BigInt(192))) + BigInt(1);
const SIGNING_CHALLENGE_TTL_SECONDS = 5 * 60;
const SIGNING_CHALLENGE_PURPOSE = "bootybank-session-proof";
const PAYMASTER_METHODS = new Set([
  "paymaster_isAvailable",
  "paymaster_getSupportedTokens",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
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
  if (origin) {
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

  const reader = request.body?.getReader();
  if (!reader) return { error: "INVALID REQUEST.", status: 400 };
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { error: "REQUEST TOO LARGE.", status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { error: "INVALID REQUEST.", status: 400 };
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { body: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
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
    return { client, token, userId: claims.user_id };
  } catch {
    return { error: "INVALID SESSION.", status: 401 };
  }
}

function normalizeStarkHash(value) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{1,64}$/.test(value)) return null;
  try {
    const felt = BigInt(value);
    if (felt <= BigInt(0) || felt >= STARK_FIELD_PRIME) return null;
    return `0x${felt.toString(16)}`;
  } catch {
    return null;
  }
}

function randomChallengeHash(services) {
  if (services.randomChallengeHash) return services.randomChallengeHash();
  const bytes = new Uint8Array(31);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes.every((byte) => byte === 0));
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function requestNowSeconds(services) {
  const milliseconds = services.now ? services.now() : Date.now();
  return Math.floor(milliseconds / 1000);
}

async function enforcePrivyRateLimit(env, key) {
  if (!env.WAITLIST_RATE_LIMITER) return true;
  const { success } = await env.WAITLIST_RATE_LIMITER.limit({ key });
  return success;
}

async function handlePrivySigningChallenge(request, env, origin, services) {
  const auth = await authenticatePrivy(request, env, services);
  if (auth.error) return json({ message: auth.error }, auth.status, origin);
  if (!(await enforcePrivyRateLimit(env, `privy-challenge:${auth.userId}`))) {
    return json({ message: "TOO MANY SIGNING REQUESTS. TRY AGAIN LATER." }, 429, origin);
  }

  const wallet = await walletRecord(env, auth.userId);
  if (!wallet) return json({ message: "CREATE YOUR STARKNET ACCOUNT FIRST." }, 409, origin);

  const now = requestNowSeconds(services);
  const challengeId = services.randomUUID ? services.randomUUID() : crypto.randomUUID();
  const hash = normalizeStarkHash(randomChallengeHash(services));
  if (!hash) return json({ message: "SIGNING CHALLENGE UNAVAILABLE." }, 503, origin);

  try {
    await env.WAITLIST_DB
      .prepare("DELETE FROM privy_signing_challenges WHERE expires_at < ? OR (consumed_at IS NOT NULL AND consumed_at < ?)")
      .bind(now, now - 86_400)
      .run();
    await env.WAITLIST_DB
      .prepare("INSERT INTO privy_signing_challenges (challenge_id, user_id, wallet_id, challenge_hash, expires_at) VALUES (?, ?, ?, ?, ?)")
      .bind(challengeId, auth.userId, wallet.wallet_id, hash, now + SIGNING_CHALLENGE_TTL_SECONDS)
      .run();
    return json({ challengeId, expiresAt: now + SIGNING_CHALLENGE_TTL_SECONDS, hash, purpose: SIGNING_CHALLENGE_PURPOSE }, 201, origin);
  } catch {
    return json({ message: "SIGNING CHALLENGE UNAVAILABLE." }, 503, origin);
  }
}

function signingRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body).sort();
  if (keys.join(",") !== "challengeId,hash,purpose,walletId") return null;
  if (body.purpose !== SIGNING_CHALLENGE_PURPOSE) return null;
  if (typeof body.challengeId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.challengeId)) return null;
  if (typeof body.walletId !== "string" || body.walletId.length < 1 || body.walletId.length > 200) return null;
  const hash = normalizeStarkHash(body.hash);
  return hash ? { challengeId: body.challengeId, hash, walletId: body.walletId } : null;
}

async function handlePrivySign(request, env, origin, services) {
  const auth = await authenticatePrivy(request, env, services);
  if (auth.error) return json({ message: auth.error }, auth.status, origin);
  if (!(await enforcePrivyRateLimit(env, `privy-sign:${auth.userId}`))) {
    return json({ message: "TOO MANY SIGNING REQUESTS. TRY AGAIN LATER." }, 429, origin);
  }

  const parsed = await parseJsonBody(request, 2_048);
  if (parsed.error) return json({ message: parsed.error }, parsed.status, origin);
  const input = signingRequest(parsed.body);
  if (!input) return json({ message: "SIGNING REQUEST NOT ALLOWED." }, 400, origin);

  const wallet = await walletRecord(env, auth.userId);
  if (!wallet || wallet.wallet_id !== input.walletId) {
    return json({ message: "WALLET DOES NOT BELONG TO THIS SESSION." }, 403, origin);
  }

  const now = requestNowSeconds(services);
  const consumed = await env.WAITLIST_DB
    .prepare("UPDATE privy_signing_challenges SET consumed_at = ? WHERE challenge_id = ? AND user_id = ? AND wallet_id = ? AND challenge_hash = ? AND consumed_at IS NULL AND expires_at >= ?")
    .bind(now, input.challengeId, auth.userId, input.walletId, input.hash, now)
    .run();
  const changes = Number(consumed?.meta?.changes ?? consumed?.changes ?? 0);
  if (changes !== 1) return json({ message: "SIGNING CHALLENGE EXPIRED OR ALREADY USED." }, 409, origin);

  try {
    const result = await auth.client.wallets().rawSign(input.walletId, {
      authorization_context: { user_jwts: [auth.token] },
      idempotency_key: input.challengeId,
      params: { hash: input.hash },
      request_expiry: Date.now() + 30_000,
    });
    if (typeof result?.signature !== "string" || !/^(0x)?[0-9a-fA-F]{128}$/.test(result.signature)) {
      throw new Error("invalid signature response");
    }
    return json({ signature: result.signature }, 200, origin);
  } catch (error) {
    console.error(JSON.stringify({
      error: error instanceof Error ? error.message : "unknown Privy error",
      message: "Privy ownership proof failed",
      userId: auth.userId,
    }));
    return json({ message: "PRIVY SIGNING TEMPORARILY UNAVAILABLE." }, 503, origin);
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

async function handleWaitlist(request, env, origin) {
  if (env.WAITLIST_RATE_LIMITER) {
    const clientKey = request.headers.get("CF-Connecting-IP");
    if (!clientKey) return json({ message: "REQUEST COULD NOT BE VERIFIED." }, 403, origin);
    const { success } = await env.WAITLIST_RATE_LIMITER.limit({ key: clientKey });
    if (!success) return json({ message: "TOO MANY REQUESTS. TRY AGAIN LATER." }, 429, origin);
  }
  const parsed = await parseJsonBody(request, 2_048);
  if (parsed.error) {
    const message = parsed.status === 413 ? parsed.error : "SEND A VALID EMAIL.";
    return json({ message }, parsed.status, origin);
  }
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

function validPaymasterRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  return body.jsonrpc === "2.0" && PAYMASTER_METHODS.has(body.method);
}

async function handleAvnuPaymaster(request, env, origin, services) {
  if (!env.AVNU_API_KEY) return json({ message: "AVNU PAYMASTER IS NOT CONFIGURED." }, 503, origin);
  if (env.WAITLIST_RATE_LIMITER) {
    const clientKey = request.headers.get("CF-Connecting-IP");
    if (!clientKey) return json({ message: "REQUEST COULD NOT BE VERIFIED." }, 403, origin);
    const { success } = await env.WAITLIST_RATE_LIMITER.limit({ key: `paymaster:${clientKey}` });
    if (!success) return json({ message: "TOO MANY PAYMASTER REQUESTS. TRY AGAIN LATER." }, 429, origin);
  }
  const parsed = await parseJsonBody(request, 98_304);
  if (parsed.error) return json({ message: parsed.error }, parsed.status, origin);
  if (!validPaymasterRequest(parsed.body)) return json({ message: "PAYMASTER REQUEST NOT ALLOWED." }, 400, origin);

  try {
    const proxyFetch = services.fetchPaymaster ?? fetch;
    const upstream = await proxyFetch(AVNU_SEPOLIA_PAYMASTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paymaster-api-key": env.AVNU_API_KEY,
      },
      body: JSON.stringify(parsed.body),
      signal: AbortSignal.timeout(15_000),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...corsHeaders(origin),
        "X-Booty-Bank-Network": "sepolia",
      },
    });
  } catch {
    return json({ message: "AVNU PAYMASTER TEMPORARILY UNAVAILABLE." }, 503, origin);
  }
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

  const isPrivyChallenge = url.pathname === "/api/wallet/starknet/challenge";
  const isPrivySign = url.pathname === "/api/wallet/starknet/sign";
  const isApiPath = url.pathname === "/api/waitlist" || url.pathname === "/api/wallet/starknet" || isPrivyChallenge || isPrivySign || url.pathname === "/api/paymaster";
  if (!isApiPath) return json({ message: "NOT FOUND." }, 404, null);
  const localRequest = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const originAllowed = !origin || PUBLIC_ORIGINS.has(origin) || (localRequest && LOCAL_ORIGINS.has(origin));
  if (!originAllowed) return json({ message: "ORIGIN NOT ALLOWED." }, 403, null);
  if ((url.pathname === "/api/paymaster" || isPrivyChallenge || isPrivySign) && !origin) return json({ message: "ORIGIN REQUIRED." }, 403, null);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return json({ message: "METHOD NOT ALLOWED." }, 405, origin);

  if (url.pathname === "/api/waitlist") return handleWaitlist(request, env, origin);
  if (url.pathname === "/api/paymaster") return handleAvnuPaymaster(request, env, origin, services);
  if (isPrivyChallenge) return handlePrivySigningChallenge(request, env, origin, services);
  if (isPrivySign) return handlePrivySign(request, env, origin, services);
  return handlePrivyWallet(request, env, origin, services);
}

export default { fetch: handleRequest };
