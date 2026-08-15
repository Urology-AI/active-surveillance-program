/**
 * Reference assistant proxy — Cloudflare Worker.
 *
 * Purpose: hold the Gemini API key server-side so it never reaches the browser
 * bundle. The client (src/patientGeminiService.js) POSTs to this Worker; the
 * Worker attaches the key and forwards to Google.
 *
 * Deploy + secret setup: see server/README.md.
 *
 * Logging policy: this file MUST NOT log prompt bodies, model output, or any
 * request payload. Only status codes and coarse error classes are ever logged.
 */

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Hard caps so the proxy cannot be abused as a general-purpose LLM relay.
const MAX_BODY_BYTES = 200_000
const MAX_CONTENTS = 40
const MAX_OUTPUT_TOKENS = 1200
const MAX_TEMPERATURE = 1.0

function json(status, obj, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

function corsHeaders(origin) {
  // ALLOWED_ORIGIN is a Worker var (not a secret). Unset => same-origin only,
  // which is the safe default when the Worker is routed under your own domain.
  if (!origin) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  }
}

function resolveOrigin(request, env) {
  const allowed = (env.ALLOWED_ORIGIN || '').trim()
  if (!allowed) return ''
  const reqOrigin = request.headers.get('Origin') || ''
  const list = allowed.split(',').map((s) => s.trim()).filter(Boolean)
  return list.includes(reqOrigin) ? reqOrigin : ''
}

/** Accept only { role, parts:[{text}] } shapes; drop everything else. */
function sanitizeContents(contents) {
  if (!Array.isArray(contents)) return null
  const out = []
  for (const item of contents.slice(-MAX_CONTENTS)) {
    const role = item?.role === 'model' ? 'model' : 'user'
    const parts = Array.isArray(item?.parts) ? item.parts : []
    const texts = parts
      .map((p) => (typeof p?.text === 'string' ? p.text : ''))
      .filter((t) => t.length > 0)
      .map((t) => ({ text: t }))
    if (texts.length) out.push({ role, parts: texts })
  }
  return out.length ? out : null
}

function sanitizeSystemInstruction(si) {
  const parts = Array.isArray(si?.parts) ? si.parts : []
  const texts = parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .map((t) => ({ text: t }))
  return texts.length ? { parts: texts } : undefined
}

export default {
  async fetch(request, env) {
    const origin = resolveOrigin(request, env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }
    if (request.method !== 'POST') {
      return json(405, { error: { message: 'Method not allowed' } }, origin)
    }
    if (!env.GEMINI_API_KEY) {
      // Misconfiguration, not a client error. No payload is logged.
      console.error('assistant-proxy: GEMINI_API_KEY secret is not set')
      return json(503, { error: { message: 'Assistant is not configured' } }, origin)
    }

    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return json(413, { error: { message: 'Request too large' } }, origin)
    }

    let payload
    try {
      payload = JSON.parse(raw)
    } catch (_) {
      return json(400, { error: { message: 'Invalid JSON body' } }, origin)
    }

    const contents = sanitizeContents(payload?.contents)
    if (!contents) {
      return json(400, { error: { message: 'Missing or invalid "contents"' } }, origin)
    }

    const requestedTemp = Number(payload?.generationConfig?.temperature)
    const requestedTokens = Number(payload?.generationConfig?.maxOutputTokens)

    const upstreamBody = {
      contents,
      systemInstruction: sanitizeSystemInstruction(payload?.systemInstruction),
      generationConfig: {
        temperature: Number.isFinite(requestedTemp)
          ? Math.min(Math.max(requestedTemp, 0), MAX_TEMPERATURE)
          : 0.35,
        maxOutputTokens: Number.isFinite(requestedTokens)
          ? Math.min(Math.max(Math.trunc(requestedTokens), 1), MAX_OUTPUT_TOKENS)
          : MAX_OUTPUT_TOKENS,
      },
    }

    let upstream
    try {
      upstream = await fetch(
        `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.GEMINI_API_KEY,
          },
          body: JSON.stringify(upstreamBody),
        }
      )
    } catch (_) {
      console.error('assistant-proxy: upstream fetch failed')
      return json(502, { error: { message: 'Assistant upstream unreachable' } }, origin)
    }

    if (!upstream.ok) {
      // Log the status only — never the response or request body.
      console.error(`assistant-proxy: upstream status ${upstream.status}`)
      return json(
        upstream.status === 429 ? 429 : 502,
        { error: { message: `Assistant upstream error (${upstream.status})` } },
        origin
      )
    }

    const text = await upstream.text()
    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  },
}
