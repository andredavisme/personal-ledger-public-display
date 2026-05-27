# 02b — CORS and Browser Security

> **When to read this:** Before you write any JavaScript that calls a Supabase Edge Function, a third-party API, or any server that you do not fully control. CORS is one of the most common silent blockers in projects built with this methodology — browser code calling cloud functions — and understanding it early will save you hours of debugging.

---

## What CORS Is

CORS stands for **Cross-Origin Resource Sharing**. It is a security mechanism built into every web browser that controls which web pages are allowed to make network requests to which servers.

An **origin** is the combination of three things:

```
protocol + hostname + port

https://personal-ledger-public-display.pages.dev   ← one origin
http://localhost:5500                               ← a different origin
https://hhyhulqngdkwsxhymmcd.supabase.co           ← a different origin
```

When your browser JavaScript (running on one origin) tries to call a server on a **different** origin, the browser enforces CORS rules before the request is allowed through.

---

## Why the Browser Enforces It

Without CORS, any webpage you visit could silently make requests to your bank, your email provider, or any other server — using your cookies and credentials — and read the response. CORS exists to prevent that.

The rule is simple: **a server must explicitly declare which origins it trusts.** If it does not, the browser blocks the response — even if the server received the request and responded successfully.

> ⚠️ This is the most important thing to understand: **the server may return a 200 OK and the browser will still block the response** if the CORS headers are missing or wrong. From the browser's perspective, the call failed. From the server's perspective, everything worked fine.

---

## The Preflight Request

For certain types of requests — including any `POST` with a `Content-Type: application/json` header, which is exactly what this project uses to call Edge Functions — the browser does **not** send the real request first.

Instead, it sends a **preflight request**: an `OPTIONS` request to the same URL, asking:

> "I am a page at origin X. Am I allowed to make a POST request with these headers to your server?"

The server must respond to that `OPTIONS` request with the correct CORS headers. If it does not, the browser cancels the real request entirely — without ever sending it.

**The preflight sequence looks like this:**

```
1. Browser → Server:  OPTIONS /functions/v1/send-donation-receipt
                      Origin: https://personal-ledger-public-display.pages.dev

2. Server  → Browser: 204 No Content
                      Access-Control-Allow-Origin: https://personal-ledger-public-display.pages.dev
                      Access-Control-Allow-Methods: POST, OPTIONS
                      Access-Control-Allow-Headers: Content-Type, Authorization

3. Browser → Server:  POST /functions/v1/send-donation-receipt
                      (the real request)
```

If step 2 is missing or the origin does not match, step 3 never happens.

---

## How This Applies to This Project

This project uses the following architecture:

```
Browser JS (community.js)
  → calls →
Supabase Edge Function (send-donation-receipt)
  → calls →
Gmail SMTP / Supabase DB
```

The browser and the Edge Function are on different origins. Therefore, the Edge Function **must** handle CORS correctly or every browser call will be silently blocked.

### The CORS headers in the Edge Function

Every Supabase Edge Function in this project that is called from browser JavaScript must include this pattern:

```typescript
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  'https://personal-ledger-public-display.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// Include CORS headers on every response
return new Response(JSON.stringify(body), {
  status,
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
});
```

### The origin must match exactly

`Access-Control-Allow-Origin` accepts exactly one origin value (or `*`). It is not a list. It does not support wildcards in subdomains. The value must match the origin of the page making the request **exactly** — including protocol and any port number.

| Page origin | Header value needed |
|---|---|
| `https://personal-ledger-public-display.pages.dev` | `https://personal-ledger-public-display.pages.dev` |
| `http://localhost:5500` | `http://localhost:5500` |
| `http://localhost:3000` | `http://localhost:3000` |

This means that **a function configured for production will block requests from localhost during local development**, and vice versa.

---

## The Local Development Problem

This is the most common CORS blocker in this methodology:

1. You write an Edge Function and set `Access-Control-Allow-Origin` to the production URL
2. You test locally from `localhost`
3. The preflight fails silently
4. You see no error in the Edge Function logs (because the request never reached the function body)
5. The browser console may show a vague CORS error, or the fetch call may appear to hang

### The recommended pattern for this project

Read the `Origin` header from the incoming request and reflect it back — but only if it is in your allowed list:

```typescript
const ALLOWED_ORIGINS = [
  'https://personal-ledger-public-display.pages.dev',
  'http://localhost:5500',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
```

This way the function works in both local development and production without changing code between environments.

> ⚠️ Never use `Access-Control-Allow-Origin: *` on a function that requires an `Authorization` header. Browsers block credentialed requests with a wildcard origin. It will not work and it is also a security risk.

---

## How CORS Appears When It Fails

CORS failures are frequently misread as other problems. Here is what you will see:

### In the browser console
```
Access to fetch at 'https://hhyhulqngdkwsxhymmcd.supabase.co/functions/v1/send-donation-receipt'
from origin 'http://localhost:5500' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### In the Edge Function logs
**Nothing.** The function body never executed. The preflight was rejected before the real request fired. This is why CORS failures are easy to confuse with "the function isn't being called" — because from the function's perspective, it wasn't.

### In the network tab
You will see the `OPTIONS` preflight request with a `4xx` or a response missing the CORS headers, followed by the real `POST` never appearing.

---

## CORS Does Not Exist on the Server

CORS is **purely a browser enforcement mechanism**. If you call your Edge Function from:

- `curl`
- Postman
- Another server
- The Supabase dashboard SQL editor
- A Deno script

...CORS headers are completely ignored. The call will succeed regardless. This is why CORS bugs only surface in the browser and are invisible in every other testing tool.

---

## Checklist: Before You Deploy a New Edge Function

- [ ] Does the function handle `OPTIONS` requests and return `204` with CORS headers?
- [ ] Does every response — success, error, and 4xx — include the CORS headers?
- [ ] Does `Access-Control-Allow-Origin` include your **production** origin?
- [ ] Does `Access-Control-Allow-Origin` also include `localhost` variants you use for local dev?
- [ ] Does `Access-Control-Allow-Headers` include `Authorization` if you pass a Bearer token?
- [ ] Have you tested from the browser (not just curl or Postman)?

---

## Checklist: When a Browser Call to an Edge Function Fails Silently

- [ ] Open DevTools → Network tab → find the `OPTIONS` preflight — what status did it return?
- [ ] Is the `Access-Control-Allow-Origin` in the response header an exact match for the current page origin?
- [ ] Check Edge Function logs — if there are **no logs at all**, the preflight was blocked before the function body ran
- [ ] Hard-refresh the page (`Cmd+Shift+R` / `Ctrl+Shift+R`) to ensure you are running the latest deployed JS
- [ ] Confirm the function is deployed (`ACTIVE` status in Supabase dashboard)

---

## Summary

- CORS is enforced by the browser, not the server
- A `POST` with `Content-Type: application/json` always triggers a preflight `OPTIONS` request
- The server must respond to `OPTIONS` with the correct `Access-Control-Allow-Origin` header
- The origin must be an exact match — no wildcards, no lists, no partial matches
- CORS failures produce **no logs** on the server side
- Local development requires localhost origins to be explicitly allowed
- Use a dynamic origin-reflection pattern to support multiple environments cleanly
- Never use `*` with `Authorization` headers
