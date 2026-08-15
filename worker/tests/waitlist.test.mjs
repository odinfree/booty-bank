import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest, normalizeEmail } from "../src/index.mjs";

function mockEnv({ configured = true } = {}) {
  const inserted = [];
  const wallets = new Map();
  const env = {
    ...(configured ? { PRIVY_APP_ID: "app_test", PRIVY_APP_SECRET: "secret_test" } : {}),
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
                return { success: true };
              },
            };
          },
        };
      },
    },
  };
  return { env, inserted, wallets };
}

function mockPrivy({ userId = "did:privy:user-1" } = {}) {
  const created = [];
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
      };
    },
  };
  return { client, created, services: { createPrivyClient: () => client } };
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
    headers: { Origin: "https://welttowelt.github.io" },
  });
  const response = await handleRequest(request, env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://welttowelt.github.io");
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

test("raw signing is not exposed to browsers", async () => {
  const { env } = mockEnv();
  const response = await handleRequest(walletRequest("/api/wallet/sign", { walletId: "wallet_123", hash: "0xa" }), env, mockPrivy().services);
  assert.equal(response.status, 404);
});
