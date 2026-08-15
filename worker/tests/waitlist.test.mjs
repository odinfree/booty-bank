import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest, normalizeEmail } from "../src/index.mjs";

function mockEnv() {
  const inserted = [];
  return {
    inserted,
    env: {
      WAITLIST_DB: {
        prepare() {
          return {
            bind(email) {
              return {
                async run() {
                  inserted.push(email);
                  return { success: true };
                },
              };
            },
          };
        },
      },
    },
  };
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

test("answers allowed CORS preflight", async () => {
  const { env } = mockEnv();
  const request = new Request("https://bootybank.app/api/waitlist", {
    method: "OPTIONS",
    headers: { Origin: "https://welttowelt.github.io" },
  });

  const response = await handleRequest(request, env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://welttowelt.github.io");
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
