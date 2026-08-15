/**
 * Outbound prompt sanitizer — the last thing that runs before any text leaves
 * the browser for the assistant proxy.
 *
 * ## Why this exists
 * The assistant proxy forwards to a model endpoint that is NOT covered by a
 * Business Associate Agreement. Nothing downstream of this file is a HIPAA
 * control. This module is therefore the only place where we decide what is
 * allowed to leave the device.
 *
 * ## Design: allowlist first, scrub second
 * Two mechanisms, in order of how much they are worth trusting:
 *
 *   1. `buildClinicalContext()` — the PRIMARY mechanism. Structured clinical
 *      context is CONSTRUCTED from an explicit allowlist of non-identifying
 *      variables (the risk engine's own inputs: GGG, PSA, PSAD, PI-RADS, core
 *      counts, genomic scores, ...). A field that is not on the allowlist is
 *      never emitted, regardless of what the caller passed. This is a
 *      construct-only-what-is-permitted design, so a new identifying field
 *      added upstream fails closed: it is dropped, not forwarded.
 *
 *   2. `scrubFreeText()` — a BACKSTOP, and explicitly a weaker one. Patient
 *      chat is free text by nature (the feature is "ask a question in your own
 *      words"), so that path cannot be eliminated. It is pattern-scrubbed for
 *      MRN-like tokens, SSNs, phone numbers, emails, street addresses, long
 *      digit runs, and dates.
 *
 * ## What this guarantees, and what it does not
 * GUARANTEES: no identifying field is ever *constructed* into the outbound
 * payload. The structured half of the request carries only allowlisted,
 * non-identifying clinical variables, with ages 90+ bucketed per the HIPAA
 * Safe Harbor convention and no exact dates.
 *
 * DOES NOT GUARANTEE: that free text is free of PHI. Pattern matching cannot
 * catch names — "my name is Robert Chen" is scrubbed by the phrase rule, but
 * "Robert Chen here, my PSA is 6" is not, and no regex will reliably catch it.
 * This is a blocklist, and blocklists leak.
 *
 * This module is NOT a compliance control and does not make the pipeline
 * "HIPAA compliant". It reduces accidental disclosure. Real PHI requires a
 * BAA-covered endpoint, authentication, and audit logging. See README.
 */

// ---------------------------------------------------------------------------
// 1. Structured clinical allowlist (primary mechanism)
// ---------------------------------------------------------------------------

/**
 * Non-identifying clinical variables that may leave the device. These mirror
 * the risk engine's inputs (see validateInputs in src/asEngine.js).
 *
 * Deliberately ABSENT and never addable by accident: name, MRN, DOB, dates of
 * service, contact details, address, provider identity, accession numbers.
 */
export const CLINICAL_ALLOWLIST = Object.freeze({
  ggg: 'number',
  psa: 'number',
  psad: 'number',
  prostateVolume: 'number',
  pirads: 'number',
  positiveCores: 'number',
  totalCores: 'number',
  maxCorePercent: 'number',
  decipher: 'number',
  gps: 'number',
  prolaris: 'number',
  psaVelocity: 'number',
  psaDoublingTime: 'number',
  age: 'age',
  // Non-identifying qualitative flags
  cribriform: 'boolean',
  intraductal: 'boolean',
  familyHistory: 'boolean',
  germlineMutation: 'boolean',
  // Relative temporal context only — never an exact date.
  monthsSinceDiagnosis: 'number',
  monthsSinceLastBiopsy: 'number',
})

/**
 * HIPAA Safe Harbor: ages over 89 are identifying and must be aggregated into
 * a single 90+ category.
 */
export const AGE_CAP = 89

function coerceAge(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  if (n < 0) return undefined
  return n > AGE_CAP ? '90+' : Math.trunc(n)
}

function coerceNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function coerceBoolean(value) {
  if (value === true || value === false) return value
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

/**
 * Build outbound clinical context by CONSTRUCTION from the allowlist.
 * Anything not on the allowlist is dropped and reported — never silently.
 *
 * Nested objects are walked one level so a caller passing
 * `{ inputs: {...}, patient: {...} }` does not smuggle fields through; keys are
 * reported with a dotted path.
 *
 * @param {object} raw
 * @returns {{ context: object, dropped: string[] }}
 */
export function buildClinicalContext(raw, _prefix = '') {
  const context = {}
  const dropped = []

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { context, dropped }
  }

  for (const [key, value] of Object.entries(raw)) {
    const path = _prefix ? `${_prefix}.${key}` : key

    // Walk nested objects rather than trusting or dropping them wholesale.
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = buildClinicalContext(value, path)
      Object.assign(context, nested.context)
      dropped.push(...nested.dropped)
      continue
    }

    const kind = CLINICAL_ALLOWLIST[key]
    if (!kind) {
      dropped.push(path)
      continue
    }

    let coerced
    if (kind === 'age') coerced = coerceAge(value)
    else if (kind === 'boolean') coerced = coerceBoolean(value)
    else coerced = coerceNumber(value)

    // A value on the allowlist that fails coercion is dropped too — an
    // unparseable "age" could be a free-text string carrying anything.
    if (coerced === undefined) dropped.push(path)
    else context[key] = coerced
  }

  return { context, dropped }
}

// ---------------------------------------------------------------------------
// 2. Free-text backstop (secondary, defence-in-depth only)
// ---------------------------------------------------------------------------

const REDACTION = '[redacted]'

/**
 * Ordered: more specific patterns first, so a phone number is not partially
 * consumed by the generic long-digit-run rule.
 */
const SCRUB_RULES = [
  { label: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { label: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g },
  {
    label: 'mrn',
    re: /\b(?:mrn|medical\s+record(?:\s+(?:number|no\.?|#))?|patient\s*(?:id|#)|account|accession)\s*(?:number|no\.?|#)?\s*(?:is|:|=|#)?\s*[A-Za-z]?\d{4,}\b/gi,
  },
  {
    label: 'phone',
    re: /(?:\+?1[-.\s]?)?\(?\b\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  },
  {
    label: 'date',
    re: /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g,
  },
  {
    label: 'date',
    re: /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
  },
  {
    label: 'address',
    re: /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+)*\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|place|pl|terrace|ter|way|circle|cir|highway|hwy)\b\.?/gi,
  },
  { label: 'zip', re: /\b\d{5}(?:-\d{4})?\b(?=\s*(?:,|$|\s(?:usa|us)\b))/gi },
  {
    label: 'name-phrase',
    re: /\b(?:my|our|patient(?:'s)?|his|her)\s+(?:full\s+|first\s+|last\s+)?name\s+is\s+[A-Z][A-Za-z'-]*(?:\s+[A-Z][A-Za-z'-]*){0,3}/g,
  },
  {
    label: 'dob',
    re: /\b(?:date\s+of\s+birth|d\.?o\.?b\.?|born\s+on)\s*[:]?\s*[^\n,.;]{0,32}/gi,
  },
  // Generic long digit run — catches unlabelled record/account numbers.
  { label: 'long-digit-run', re: /\b\d{6,}\b/g },
]

/**
 * Pattern-scrub free text. BACKSTOP ONLY — see module docblock. Cannot catch
 * bare names.
 *
 * @param {string} input
 * @returns {{ text: string, redactions: string[] }} redactions lists the rule
 *   labels that fired (never the matched values — those are the sensitive part
 *   and must not be retained or logged).
 */
export function scrubFreeText(input) {
  let text = String(input ?? '')
  const redactions = []

  for (const { label, re } of SCRUB_RULES) {
    // Fresh lastIndex each call; /g regexes are stateful.
    re.lastIndex = 0
    if (re.test(text)) {
      re.lastIndex = 0
      text = text.replace(re, REDACTION)
      if (!redactions.includes(label)) redactions.push(label)
    }
  }

  return { text, redactions }
}

// ---------------------------------------------------------------------------
// 3. Choke point
// ---------------------------------------------------------------------------

function devWarn(message, detail) {
  // STATIC member access only — `import.meta.env?.DEV` would defeat Vite's
  // compile-time replacement and cause the whole env object (every VITE_*
  // value) to be inlined into the bundle. Vite folds this to a literal
  // true/false; the try/catch covers plain-node test runs where import.meta.env
  // is undefined.
  try {
    if (import.meta.env.DEV) console.warn(`[promptSanitizer] ${message}`, detail)
  } catch (_) {}
}

/**
 * Sanitize a complete Gemini-shaped request body immediately before it is sent.
 * Every `contents[].parts[].text` is run through the free-text backstop, and any
 * attached structured context is rebuilt from the allowlist.
 *
 * `systemInstruction` is NOT scrubbed: it is static, build-time handout text
 * from the repo with no user or patient input in it.
 *
 * @param {object} body
 * @param {object} [clinicalContext] optional structured context to attach
 * @returns {{ body: object, redactions: string[], dropped: string[] }}
 */
export function sanitizeOutboundBody(body, clinicalContext) {
  const redactions = []
  const dropped = []

  const contents = Array.isArray(body?.contents) ? body.contents : []
  const safeContents = contents.map((turn) => ({
    ...turn,
    parts: (Array.isArray(turn?.parts) ? turn.parts : []).map((part) => {
      if (typeof part?.text !== 'string') return part
      const { text, redactions: hits } = scrubFreeText(part.text)
      for (const h of hits) if (!redactions.includes(h)) redactions.push(h)
      return { ...part, text }
    }),
  }))

  const out = { ...body, contents: safeContents }

  if (clinicalContext) {
    const { context, dropped: droppedKeys } = buildClinicalContext(clinicalContext)
    dropped.push(...droppedKeys)
    if (Object.keys(context).length > 0) {
      out.contents = [
        {
          role: 'user',
          parts: [
            {
              text:
                'Non-identifying clinical context for this patient ' +
                '(de-identified; no dates or identifiers):\n' +
                JSON.stringify(context),
            },
          ],
        },
        ...safeContents,
      ]
    }
  }

  if (redactions.length) {
    devWarn('redacted possible identifiers from outbound prompt', redactions)
  }
  if (dropped.length) {
    devWarn('dropped non-allowlisted fields from clinical context', dropped)
  }

  return { body: out, redactions, dropped }
}
