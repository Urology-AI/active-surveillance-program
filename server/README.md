# Assistant proxy (reference implementation)

A minimal Cloudflare Worker that holds the Gemini API key **server-side** and
forwards patient-education requests to Google. The browser bundle never
contains a key.

Files:

- `assistant-proxy.js` — the Worker
- `wrangler.toml` — config (no secrets)

## What it does

- Accepts `POST` with `{ systemInstruction, contents, generationConfig }`
- Rejects anything that isn't that shape; caps body size, turn count,
  `temperature`, and `maxOutputTokens`
- Pins the model server-side (`gemini-2.5-flash`)
- Adds the key via the `x-goog-api-key` header (never a query string)
- Returns Google's JSON response verbatim to the client
- **Logs status codes only.** Prompt bodies, conversation contents, and model
  output are never written to logs.

## Deploy

```bash
cd server

# 1. Store the key as an encrypted secret (paste when prompted).
#    Do NOT put it in wrangler.toml, .env, or any committed file.
npx wrangler secret put GEMINI_API_KEY

# 2. Deploy
npx wrangler deploy
```

### Same-origin routing (recommended)

Route the Worker at `https://<your-app-domain>/api/assistant` (uncomment the
`[[routes]]` block in `wrangler.toml`). Then build the app with:

```
VITE_ASSISTANT_ENDPOINT=/api/assistant
```

No CORS headers are needed or emitted.

### Cross-origin (e.g. app on GitHub Pages, Worker on workers.dev)

Set `ALLOWED_ORIGIN` in `wrangler.toml` to your app's exact origin
(comma-separated for multiple), then build with the absolute URL:

```
VITE_ASSISTANT_ENDPOINT=https://as-assistant-proxy.<subdomain>.workers.dev
```

GitHub Pages cannot proxy same-origin paths, so a Pages deployment must use
this mode — which means the endpoint is publicly callable. Put Cloudflare
rate-limiting (and, for anything beyond a demo, real authentication) in front
of it.

## Local development

```bash
cd server
npx wrangler dev            # serves on http://localhost:8787
```

Then run the app with `VITE_ASSISTANT_ENDPOINT=http://localhost:8787`.

## Before any real PHI

This proxy is **not** sufficient for protected health information on its own.
Google's public Generative Language API is not covered by a Business Associate
Agreement. Before any real patient data flows through this path, the upstream
must be swapped for a BAA-covered endpoint (e.g. Vertex AI under a Google Cloud
BAA, or another covered vendor), and the deployment must add authentication,
audit logging, and a signed BAA. See the main README.
