const ALLOWED_ORIGINS = new Set([
  "https://bootybank.app",
  "https://www.bootybank.app",
  "https://welttowelt.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
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
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(payload, status, origin) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(origin) });
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");

  if (url.pathname !== "/api/waitlist") {
    return json({ message: "NOT FOUND." }, 404, origin);
  }

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ message: "ORIGIN NOT ALLOWED." }, 403, origin);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return json({ message: "METHOD NOT ALLOWED." }, 405, origin);
  }

  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 2_048) {
    return json({ message: "REQUEST TOO LARGE." }, 413, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: "SEND A VALID EMAIL." }, 400, origin);
  }

  if (body.company) {
    return json({ message: "YOU ARE ON THE LIST." }, 200, origin);
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return json({ message: "ENTER A VALID EMAIL." }, 400, origin);
  }

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

export default {
  fetch: handleRequest,
};
