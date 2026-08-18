import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest, normalizeEmail } from "../src/index.mjs";

function mockEnv({ configured = true, avnuConfigured = true } = {}) {
  const inserted = [];
  const wallets = new Map();
  const challenges = new Map();
  const env = {
    ...(configured ? { PRIVY_APP_ID: "app_test", PRIVY_APP_SECRET: "secret_test" } : {}),
    ...(avnuConfigured ? { AVNU_API_KEY: "avnu_test_secret" } : {}),
    WAITLIST_DB: {
      prepare(sql) {
        return {
          bind(...values) {
            return {
              async first() {
                if (sql.includes("WHERE user_id = ? AND wallet_id = ?")) {
                  const record = wallets.get(values[0]);
                  return record?.wallet_id === values[1] ? { owned: 1 } : null;
                }
                if (sql.includes("FROM privy_starknet_wallets WHERE user_id = ?")) {
                  return wallets.get(values[0]) ?? null;
                }
                return null;
              },
              async run() {
                if (sql.startsWith("INSERT INTO waitlist_signups")) inserted.push(values[0]);
                if (sql.startsWith("INSERT INTO privy_starknet_wallets") && !wallets.has(values[0])) {
                  wallets.set(values[0], {
                    wallet_id: values[1],
                    privy_address: values[2],
                    public_key: values[3],
                  });
                }
                if (sql.startsWith("INSERT INTO privy_signing_challenges")) {
                  challenges.set(values[0], {
                    challenge_id: values[0],
                    user_id: values[1],
                    wallet_id: values[2],
                    challenge_hash: values[3],
                    expires_at: values[4],
                    consumed_at: null,
                  });
                }
                if (sql.startsWith("DELETE FROM privy_signing_challenges")) {
                  for (const [challengeId, challenge] of challenges) {
                    if (challenge.expires_at < values[0] || (challenge.consumed_at !== null && challenge.consumed_at < values[1])) {
                      challenges.delete(challengeId);
                    }
                  }
                }
                if (sql.startsWith("UPDATE privy_signing_challenges")) {
                  const [consumedAt, challengeId, userId, walletId, hash, minimumExpiry] = values;
                  const challenge = challenges.get(challengeId);
                  const allowed = challenge
                    && challenge.user_id === userId
                    && challenge.wallet_id === walletId
                    && challenge.challenge_hash === hash
                    && challenge.consumed_at === null
                    && challenge.expires_at >= minimumExpiry;
                  if (allowed) challenge.consumed_at = consumedAt;
                  return { success: true, meta: { changes: allowed ? 1 : 0 } };
                }
                return { success: true, meta: { changes: 0 } };
              },
            };
          },
        };
      },
    },
  };
  return { challenges, env, inserted, wallets };
}

function mockPrivy({ userId = "did:privy:user-1" } = {}) {
  const created = [];
  const signed = [];
  const client = {
    utils() {
      return {
        auth() {
          return {
            async verifyAccessToken(token) {
              if (token !== "valid-token") throw new Error("invalid");
              return { user_id: userId };
            },
          };
        },
      };
    },
    wallets() {
      return {
        async create(input) {
          created.push(input);
          return {
            id: "wallet_123",
            address: "0x123",
            public_key: "0x456",
          };
        },
        async rawSign(walletId, input) {
          signed.push({ input, walletId });
          return { signature: "ab".repeat(64) };
        },
      };
    },
  };
  return { client, created, signed, services: { createPrivyClient: () => client } };
}

function walletRequest(path, body, token = "valid-token") {
  return new Request(`https://bootybank.app${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Origin: "https://bootybank.app",
    },
    body: JSON.stringify(body),
  });
}

test("normalizes valid email and rejects invalid input", () => {
  assert.equal(normalizeEmail(" Creator@Example.COM "), "creator@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizeEmail("a".repeat(255) + "@example.com"), null);
});

test("stores only the normalized email", async () => {
  const { env, inserted } = mockEnv();
  const request = new Request("https://bootybank.app/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://bootybank.app" },
    body: JSON.stringify({ email: " Creator@Example.COM " }),
  });
  const response = await handleRequest(request, env);
  assert.equal(response.status, 201);
  assert.deepEqual(inserted, ["creator@example.com"]);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://bootybank.app");
});

test("rejects untrusted browser origins before storage", async () => {
  const { env, inserted } = mockEnv();
  const request = new Request("https://bootybank.app/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
    body: JSON.stringify({ email: "creator@example.com" }),
  });
  const response = await handleRequest(request, env);
  assert.equal(response.status, 403);
  assert.deepEqual(inserted, []);
});

test("answers allowed CORS preflight with authorization enabled", async () => {
  const { env } = mockEnv();
  const request = new Request("https://bootybank.app/api/wallet/starknet", {
    method: "OPTIONS",
    headers: { Origin: "https://odinfree.github.io" },
  });
  const response = await handleRequest(request, env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://odinfree.github.io");
  assert.match(response.headers.get("Access-Control-Allow-Headers"), /Authorization/);
});

test("redirects www to the apex while preserving path and query", async () => {
  const { env } = mockEnv();
  const response = await handleRequest(new Request("https://www.bootybank.app/creator/card?ref=launch&mode=private"), env);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("Location"), "https://bootybank.app/creator/card?ref=launch&mode=private");
});

test("rejects oversized requests before parsing or storage", async () => {
  const { env, inserted } = mockEnv();
  const request = new Request("https://bootybank.app/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Length": "2049",
      "Content-Type": "application/json",
      Origin: "https://bootybank.app",
    },
    body: JSON.stringify({ email: "creator@example.com" }),
  });
  const response = await handleRequest(request, env);
  assert.equal(response.status, 413);
  assert.deepEqual(inserted, []);
});

test("stops streaming request bodies at the byte limit without Content-Length", async () => {
  const { env, inserted } = mockEnv();
  const request = new Request("https://bootybank.app/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://bootybank.app" },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`{"email":"${"a".repeat(2200)}@example.com"}`));
        controller.close();
      },
    }),
    duplex: "half",
  });
  const response = await handleRequest(request, env);
  assert.equal(response.status, 413);
  assert.deepEqual(inserted, []);
});

test("production rejects localhost origins while local development accepts them", async () => {
  const production = mockEnv();
  const prodResponse = await handleRequest(new Request("https://bootybank.app/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify({ email: "creator@example.com" }),
  }), production.env);
  assert.equal(prodResponse.status, 403);

  const local = mockEnv();
  const localResponse = await handleRequest(new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify({ email: "creator@example.com" }),
  }), local.env);
  assert.equal(localResponse.status, 201);
});

test("rate limits abusive waitlist clients before database writes", async () => {
  const { env, inserted } = mockEnv();
  env.WAITLIST_RATE_LIMITER = { async limit({ key }) { return { success: key !== "203.0.113.9" }; } };
  const response = await handleRequest(new Request("https://bootybank.app/api/waitlist", {
    method: "POST",
    headers: {
      "CF-Connecting-IP": "203.0.113.9",
      "Content-Type": "application/json",
      Origin: "https://bootybank.app",
    },
    body: JSON.stringify({ email: "creator@example.com" }),
  }), env);
  assert.equal(response.status, 429);
  assert.deepEqual(inserted, []);
});

test("requires configured Privy secrets and a valid bearer session", async () => {
  const disabled = mockEnv({ configured: false });
  const unavailable = await handleRequest(walletRequest("/api/wallet/starknet", {}), disabled.env, mockPrivy().services);
  assert.equal(unavailable.status, 503);

  const enabled = mockEnv();
  const missing = new Request("https://bootybank.app/api/wallet/starknet", {
    method: "POST",
    headers: { Origin: "https://bootybank.app" },
  });
  const unauthorized = await handleRequest(missing, enabled.env, mockPrivy().services);
  assert.equal(unauthorized.status, 401);
});

test("creates one owner-bound Privy Starknet wallet and reuses it", async () => {
  const { env } = mockEnv();
  const privy = mockPrivy();
  const first = await handleRequest(walletRequest("/api/wallet/starknet", {}), env, privy.services);
  const second = await handleRequest(walletRequest("/api/wallet/starknet", {}), env, privy.services);
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(privy.created.length, 1);
  assert.deepEqual(privy.created[0].owner, { user_id: "did:privy:user-1" });
  assert.equal((await second.json()).walletId, "wallet_123");
});

test("raw signing is limited to an authenticated single-use ownership challenge", async () => {
  const { env } = mockEnv();
  const privy = mockPrivy();
  const services = {
    ...privy.services,
    now: () => 1_800_000_000_000,
    randomChallengeHash: () => "0xabc",
    randomUUID: () => "11111111-1111-4111-8111-111111111111",
  };
  await handleRequest(walletRequest("/api/wallet/starknet", {}), env, services);

  const challengeResponse = await handleRequest(walletRequest("/api/wallet/starknet/challenge", {}), env, services);
  assert.equal(challengeResponse.status, 201);
  const challenge = await challengeResponse.json();
  assert.equal(challenge.hash, "0xabc");
  assert.equal(challenge.purpose, "bootybank-session-proof");

  const body = {
    challengeId: challenge.challengeId,
    hash: challenge.hash,
    purpose: challenge.purpose,
    walletId: "wallet_123",
  };
  const signResponse = await handleRequest(walletRequest("/api/wallet/starknet/sign", body), env, services);
  assert.equal(signResponse.status, 200);
  assert.equal((await signResponse.json()).signature, "ab".repeat(64));
  assert.equal(privy.signed.length, 1);
  assert.deepEqual(privy.signed[0].input.authorization_context, { user_jwts: ["valid-token"] });
  assert.equal(privy.signed[0].input.idempotency_key, challenge.challengeId);

  const replay = await handleRequest(walletRequest("/api/wallet/starknet/sign", body), env, services);
  assert.equal(replay.status, 409);
  assert.equal(privy.signed.length, 1);
});

test("rejects arbitrary hashes, wallet substitution, and the old raw-sign route", async () => {
  const { env } = mockEnv();
  const privy = mockPrivy();
  const services = {
    ...privy.services,
    now: () => 1_800_000_000_000,
    randomChallengeHash: () => "0xabc",
    randomUUID: () => "11111111-1111-4111-8111-111111111111",
  };
  await handleRequest(walletRequest("/api/wallet/starknet", {}), env, services);
  const challenge = await (await handleRequest(walletRequest("/api/wallet/starknet/challenge", {}), env, services)).json();

  const arbitrary = await handleRequest(walletRequest("/api/wallet/starknet/sign", {
    challengeId: challenge.challengeId,
    hash: "0xdef",
    purpose: challenge.purpose,
    walletId: "wallet_123",
  }), env, services);
  assert.equal(arbitrary.status, 409);

  const substituted = await handleRequest(walletRequest("/api/wallet/starknet/sign", {
    challengeId: challenge.challengeId,
    hash: challenge.hash,
    purpose: challenge.purpose,
    walletId: "wallet_attacker",
  }), env, services);
  assert.equal(substituted.status, 403);

  const legacy = await handleRequest(walletRequest("/api/wallet/sign", { walletId: "wallet_123", hash: "0xa" }), env, services);
  assert.equal(legacy.status, 404);
  assert.equal(privy.signed.length, 0);
});

function paymasterRequest(body, extraHeaders = {}) {
  return new Request("https://bootybank.app/api/paymaster", {
    method: "POST",
    headers: {
      "CF-Connecting-IP": "203.0.113.10",
      "Content-Type": "application/json",
      Origin: "https://bootybank.app",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

test("keeps the AVNU key server-side and proxies read-only Sepolia paymaster metadata", async () => {
  const { env } = mockEnv();
  const seen = [];
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "paymaster_isAvailable",
  };
  const response = await handleRequest(paymasterRequest(body), env, {
    async fetchPaymaster(url, init) {
      seen.push({ url, key: init.headers["x-paymaster-api-key"], body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { type: "invoke" } }), {
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Booty-Bank-Network"), "sepolia");
  assert.equal(response.headers.get("x-paymaster-api-key"), null);
  assert.equal(seen[0].url, "https://sepolia.paymaster.avnu.fi");
  assert.equal(seen[0].key, "avnu_test_secret");
  assert.deepEqual(seen[0].body, body);
});

test("rejects all paymaster build and execute requests", async () => {
  const { env } = mockEnv();
  for (const method of ["paymaster_buildTransaction", "paymaster_executeTransaction", "eth_sendTransaction"]) {
    const response = await handleRequest(paymasterRequest({
      jsonrpc: "2.0",
      id: 2,
      method,
      params: { parameters: { fee_mode: { mode: "sponsored" } } },
    }), env);
    assert.equal(response.status, 400);
  }
});

test("rejects originless paymaster requests", async () => {
  const { env } = mockEnv();
  const response = await handleRequest(new Request("https://bootybank.app/api/paymaster", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "paymaster_isAvailable" }),
  }), env);
  assert.equal(response.status, 403);
});

test("requires the AVNU Worker secret before proxying", async () => {
  const { env } = mockEnv({ avnuConfigured: false });
  const response = await handleRequest(paymasterRequest({ jsonrpc: "2.0", id: 1, method: "paymaster_isAvailable" }), env);
  assert.equal(response.status, 503);
});
