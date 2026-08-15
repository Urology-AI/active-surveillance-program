# Tewari Active Surveillance Program

A clinical decision support tool for guiding clinicians through the Tewari Active Surveillance (AS) protocol after a positive prostate biopsy. Built as a step-by-step wizard that covers all three phases of the pathway — from initial risk stratification through enrollment and ongoing monitoring.

## Features

- **3-Part Clinical Pathway**: Covers Initial Risk Stratification, Pre-Enrollment Verification, and Standard AS Protocol
- **Sticky Header Navigation**: Mount Sinai branding with color-coded part badge and live step breadcrumb
- **Interactive Flow Map**: Visual flowchart showing current position and path taken through the decision tree
- **Progress Tracking**: Gradient progress bar with step label and back/forward navigation
- **Step-Card Animations**: Smooth fade-and-slide transitions between steps
- **Copy & Export**: Copy path summary to clipboard or export as PDF from any end state
- **Responsive Design**: Optimized for desktop clinic use and mobile review

## Clinical Pathway

### Part 1 — Initial Risk Stratification (Steps 1–5)

Triggered by a first positive prostate biopsy.

| Step | Screen | Decision |
|------|--------|----------|
| 1 | Patient Intent / SDM | Does patient agree to further testing? |
| 2 | Gleason Score | Gleason 6, 7 (3+4), or 7 (4+3)+? |
| 3 | Risk Stratification | Favorable vs. unfavorable intermediate risk (Gleason 7 3+4 only) |
| 4 | Medical History | Any disqualifying high-risk history? |
| 5 | SDM on Active Surveillance | Shared decision-making discussion |

**End States:**
- **AS Initiated** → continues to Part 2
- **Definitive Treatment** — patient does not meet AS criteria
- **Refuse / Defer** — patient declines further workup; return visit in 3–6 months

---

### Part 2 — Pre-Enrollment Verification (Steps 6–9)

Confirms eligibility and completes workup before formal AS enrollment.

| Step | Screen | Decision |
|------|--------|----------|
| 6 | Life Expectancy | > 10 years? (Lee-Schonberg calculator) |
| 7 | Provider Actions | Order confirmatory Bx + genomics (Decipher, ExoDx, OncoDx, SelectMDx, BRCA) |
| 8 | TR Confirmatory Biopsy | Negative / Gleason 6, or Gleason 7 (3+4)? |
| 9 | Concerning Features | Any concerning features present? |

**End States:**
- **Enrolled in AS** → continues to Part 3
- **High Intensity AS Protocol** — concerning features present; biopsy q1–2 years; consider Poly-ICLC trial
- **Watchful Waiting** — life expectancy ≤ 10 years
- **Definitive Treatment** — confirmatory Bx shows Gleason 7 (3+4)

---

### Part 3 — Standard AS Protocol (Steps 10–14)

Ongoing monitoring for patients formally enrolled in active surveillance.

| Step | Screen | Decision |
|------|--------|----------|
| 10 | Uroflow + PVR Check | Baseline uroflowmetry and post-void residual |
| 11 | Initiate AS Protocol | Quarterly PSA + office visit; annual MRI, MUS (ExactVu), DRE |
| 12 | PSMA Assessment (No MRI) | PSMA PET/CT if MRI not available |
| 13 | New Positive Findings | Any new concerning findings on monitoring? |
| 14 | Early Biopsy Results | Results of surveillance biopsy |

**End States:**
- **Continue on AS** — patient remains on monitoring protocol (Q PSA, A MRI/DRE, B biopsy + genomics)
- **Definitive Treatment** — reclassification triggers treatment

---

## Tech Stack

- React 18 (no JSX — uses `React.createElement` throughout)
- Vite
- Tailwind CSS (Mount Sinai palette: cerulean `#06ABEB`, navy `#212070`, cetacean `#00002D`, magenta `#DC298D`)
- Lucide React (icons)

## Development

```bash
# Install dependencies
npm install

# Optional: point the app at a deployed assistant proxy (see below).
# Everything in .env is public — no secrets belong here.
cp .env.example .env
# Edit .env and set VITE_ASSISTANT_ENDPOINT

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## AI assistant architecture

The patient-facing education chat is optional. When enabled, it calls a
**server-side proxy** that holds the model API key; the browser never sees a
credential.

```
browser (patientGeminiService.js)
   │  1. promptSanitizer.js scrubs the outbound payload
   │  2. POST { systemInstruction, contents, generationConfig }
   ▼
epsa-gemini-proxy  (existing Cloudflare Worker, deployed separately)
   │  adds the Gemini API key from a server-side secret
   ▼
Google Generative Language API
```

The proxy is an **existing, separately deployed Worker** shared with the ePSA
tool:

```
https://epsa-gemini-proxy.e-psa.workers.dev/
```

This repo does not contain the Worker's source and does not deploy it.

> **Unresolved: the Worker's request path.** Probing the deployed Worker,
> every path tried — including `/`, `/api`, `/chat`, `/generate`, `/assistant`,
> `/api/gemini`, and `/v1beta/models/gemini-2.5-flash:generateContent` — returns
> `HTTP 404` with body `{"error":"Not found"}` for both GET and POST. That JSON
> body is the Worker's own (not Cloudflare's edge 404), so the Worker is live
> and routing; the correct path is simply not guessable from outside. Until the
> path and body schema are confirmed from the Worker's source, the default
> endpoint above will 404 and the client will fall back to handout/topic
> answers. Set `VITE_ASSISTANT_ENDPOINT` to the full correct URL once known.

The URL is a **non-secret location**, not a credential. It is the built-in
default, so the assistant works with no `.env` at all. Override it by setting
`VITE_ASSISTANT_ENDPOINT` at build time, or set it to the empty string to ship
with the live assistant disabled — the app then degrades gracefully: handout
search and guideline-topic answers still work, and the chat status bar reads
"AI assistant offline — handout & topics only".

### Why the previous approach was unsafe

The app used to read `VITE_GEMINI_API_KEY` and inline it into the bundle via a
Vite `define`, then send it from the browser as a URL query parameter.

- **Vite `define` and all `VITE_*` variables are compile-time inlining, not
  secret storage.** The key shipped as a plain string literal in the public
  JavaScript on GitHub Pages, extractable by anyone who opened DevTools or
  fetched the JS file — no reverse engineering required. Referrer restrictions
  on the key are trivially spoofable and are not a substitute.
- **The key was in a query string**, so it also landed in proxy logs, browser
  history, and any intermediary that records URLs.
- **Patient context was posted directly from the browser to Google**, leaving
  no server-side boundary at which to enforce authentication, rate limiting,
  audit logging, or a Business Associate Agreement — all prerequisites for the
  HIPAA / SaMD posture this project targets.

Any key present in a previously shipped bundle should be considered publicly
disclosed; removing the code does not un-publish it.

## Outbound prompt sanitization (PHI)

Because the proxy's upstream is not BAA-covered, `src/promptSanitizer.js` is the
control that decides what may leave the browser. It runs at the **single choke
point** in `patientGeminiService.js` — there is exactly one `fetch()` in `src/`,
and it is downstream of the sanitizer, so no call path bypasses it.

Two mechanisms:

1. **Allowlist construction (primary).** Structured clinical context is built
   only from an explicit allowlist of non-identifying variables (GGG, PSA, PSAD,
   prostate volume, PI-RADS, core counts, max core %, genomic scores, PSA
   velocity / doubling time, ...). Anything not on the list is dropped and
   reported, so a new identifying field added upstream fails closed. Ages over
   89 are bucketed to `"90+"` per HIPAA Safe Harbor, and exact dates are never
   passed — only relative intervals such as `monthsSinceDiagnosis`.
2. **Free-text backstop (secondary).** Patient chat is free text by nature, so
   that path cannot be removed. Every turn — including replayed history, not
   just the newest message — is scrubbed for MRN-like tokens, SSNs, phones,
   emails, street addresses, long digit runs, and dates.

In development, dropped fields and fired redaction rules are logged via
`console.warn` so drift is noticed.

**What this guarantees:** no identifying field is ever *constructed* into the
outbound payload.

**What it does not guarantee:** that free text is free of PHI. Pattern matching
cannot catch names — `my name is X` is caught by a phrase rule, but `X here, my
PSA is 6` is not, and no regex will reliably catch it. This is a blocklist, and
blocklists leak. `src/__tests__/promptSanitizer.test.js` asserts this gap
explicitly rather than leaving it implied.

This is **not** a compliance control and does not make the pipeline "HIPAA
compliant". It reduces accidental disclosure.

### Required before any real PHI

> **The current configuration is for de-identified, general patient education
> only.** Google's public Generative Language API is not covered by a Business
> Associate Agreement. Before any protected health information flows through
> this path, the proxy's upstream must be repointed at a **BAA-covered
> endpoint** (e.g. Vertex AI under a signed Google Cloud BAA, or another covered
> vendor), and the deployment must add authentication, access controls, and
> audit logging. The client-side sanitizer described above reduces accidental
> disclosure; it is not a compliance control.

### Proxy origin restriction (to be applied on the Worker)

The Worker should accept requests only from known origins. As deployed it
returns **no `Access-Control-Allow-Origin` header at all** — verified with both
a legitimate origin and `https://evil.example`, on `OPTIONS` and `POST`; both
got an identical bare 404 — so the allowlist still needs to be added there.
Without it the browser fetch will fail on CORS even once the path is correct.
Required origins:

| Origin | Purpose |
|---|---|
| `https://as.millionstrongmen.com` | this AS tool (from `public/CNAME`) |
| `http://localhost:5173` | Vite dev server |
| *ePSA tool origin* | **user must confirm** — not discoverable from this repo |

The Worker must echo the request `Origin` **only when it is on the allowlist**,
send `Vary: Origin`, answer the `OPTIONS` preflight with
`Access-Control-Allow-Methods: POST, OPTIONS` and
`Access-Control-Allow-Headers: Content-Type`, and reject disallowed origins by
omitting the header (or returning 403).

Note that `Origin` is only enforced by browsers and is trivially forged by curl
or any script, so this restricts other *websites*, not determined abuse; it is
not authentication.

## Access gating (what it is and is not)

The app presents **acknowledgment gates** — a clinician acknowledgment before
the pathway/AS tool and a patient acknowledgment before the education chat.
These are **disclaimers, not authentication**. They record that the user has
read the educational-use notice; they do not verify identity, do not restrict
access, and must never be relied on to protect PHI. All content behind them is
served publicly.

If real access control is ever needed, it must be enforced server-side (SSO or
an identity-aware proxy in front of the deployment), not in the client bundle.

### Cloudflare Access, path-scoped (`/clinician/`)

The clinician entry point is a **real document** at `/clinician/index.html`
(separate Vite entry, see `vite.config.js`), not a client-side route. That is
what makes it gateable: Cloudflare Access enforces on document requests at the
edge, so a client-only route would never reach the edge and could not be
protected. The root document stays public for patients.

Setup:

1. **Proxy the hostname.** `as.millionstrongmen.com` currently CNAMEs to
   `urology-ai.github.io` **DNS-only** (it resolves to GitHub's
   `185.199.108–111.153`). Access cannot enforce on an unproxied record — flip
   it to proxied (orange cloud) in Cloudflare DNS. SSL mode `Full`; GitHub Pages
   serves a valid certificate.
2. **Create a self-hosted Access application** for
   `as.millionstrongmen.com/clinician` (path-scoped).
3. **Attach the existing reusable policy** — the same policy used by the digital
   twin app can be reused; it does not need redefining. The *application* is
   per-hostname/path and does need creating.
4. Each application has its own **AUD** tag. If the proxy is later set to verify
   `Cf-Access-Jwt-Assertion`, it must accept this application's AUD.

**What this does and does not protect.** Access gates the `/clinician/` document
request. The JavaScript bundle is shared with the public root entry and is
served from `/assets/` — it is public either way, and so is anything compiled
into it. Path-scoped Access controls *who can load the clinician page*, not
*who can read the clinician code*. Do not put anything secret in the bundle; the
same rule that applies to API keys applies here.

## Deployment

This project is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the `master` branch.

The Pages build carries **no secrets**. If the AI assistant is wanted on the
Pages deployment, set `VITE_ASSISTANT_ENDPOINT` (a public URL) in the workflow's
build env and deploy the proxy separately per `server/README.md`.

## License

MIT

## Testing

The clinical decision engines (`src/asEngine.js`, `src/progressionEngine.js`) are
covered by a Vitest regression suite in `src/__tests__/`.

```bash
npm test          # run once
npm run test:watch # watch mode
```

The suite is a **regression net**: it asserts the engines' current behavior
(hard stops, every numeric tier boundary, the Layer-2 `cohortContext`
invariant, and malformed-input handling) so that unintended changes to
treatment-adjacent logic fail loudly. Tests marked `// SUSPECT:` document
behavior that looks clinically or numerically questionable; they pin the
current behavior rather than assert the desired behavior, and each carries a
comment explaining the concern.
