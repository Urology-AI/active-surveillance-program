/**
 * Input guards for the patient education chat: a privacy check (no personal
 * identifiers) and an off-topic check. Runs entirely in the browser; messages
 * are never sent anywhere.
 */

const ON_TOPIC_SIGNALS = [
  /\bprostate\b/i,
  /\bcancer\b/i,
  /\bpsa\b/i,
  /\bbiopsy(?:ies)?\b/i,
  /\bgleason\b/i,
  /\bgrade\s*group\b/i,
  /\bactive\s+surveillance\b/i,
  /\bsurveillance\b/i,
  /\bobservation\b/i,
  /\bwatchful\s+waiting\b/i,
  /\bprostatectomy\b/i,
  /\bradiation\b/i,
  /\b(?:mp)?mri\b/i,
  /\bpsma\b/i,
  /\bgenomic\b/i,
  /\boncologist\b/i,
  /\burologist\b/i,
  /\bnccn\b/i,
  /\b(?:urinary|erectile|sexual function|testosterone|hormone)\b/i,
  /\b(?:exercise|diet|lifestyle|nutrition)\b/i,
  /\b(?:anxiety|anxious|worry|worried|stress|fear|cope|coping)\b/i,
  /\btreatment\b/i,
  /\bmonitoring\b/i,
  /\bside\s+effect\b/i,
  /\bsymptom\b/i,
  /\bcare\s+team\b/i,
  /\bclinician\b/i,
  /\b(?:shim|ipss)\b/i,
  /\bexactvu\b/i,
  /\bmicro.?ultrasound\b/i,
  /\b(?:family\s+history|inherited\s+mutation|brca|hoxb13)\b/i,
  /\b(?:cribriform|intraductal|idc.?p|hgpin|asap|asin)\b/i,
]

// These patterns clearly signal off-topic requests — reject without API call.
const CLEAR_OFF_TOPIC_PATTERNS = [
  /\b(?:recipe|cooking\s+tip|restaurant|cuisine|what\s+should\s+i\s+(?:eat|cook|order))\b/i,
  /\b(?:travel|hotel|flight|vacation|trip|destination|where\s+should\s+i\s+go)\b/i,
  /\b(?:weather|forecast|temperature|climate)\b/i,
  /\b(?:stock\s+market|cryptocurrency|bitcoin|ethereum|nft|invest(?:ing|ment))\b/i,
  /\b(?:football|soccer|basketball|baseball|nfl|nba|mlb|nhl|sport(?:s)?\s+team|match\s+score)\b/i,
  /\b(?:politics|election|president|congress|senate|democrat|republican|vote)\b/i,
  /\b(?:movie|film|tv\s+show|netflix|streaming|celebrity|music\s+(?:song|album|artist)|playlist)\b/i,
  /\b(?:tell\s+me\s+a\s+joke|riddle|trivia|quiz|crossword|word\s+game)\b/i,
  /\b(?:relationship\s+advice|dating|romantic|love\s+life|breakup)\b/i,
  /\b(?:write\s+(?:me\s+)?(?:an?\s+)?(?:essay|poem|story|code|program|script))\b/i,
]

// Short conversational turns are always allowed (follow-up context, greetings, thanks).
const CONVERSATIONAL_RE =
  /^(?:hi|hello|hey|thanks?|thank\s+you|ok(?:ay)?|yes|no|sure|got\s+it|i\s+see|makes?\s+sense|understood|great|good|please\s+(?:continue|elaborate|go\s+on)|tell\s+me\s+more|can\s+you\s+(?:explain|clarify)|what\s+do\s+you\s+mean|how\s+(?:do\s+you\s+)?(?:mean|so)|[\w\s]{1,25})[?!.]*$/i

const OFF_TOPIC_RESPONSE =
  "I\u2019m here specifically to answer questions about prostate cancer and active surveillance. For other topics, please speak with your care team or primary doctor."

/**
 * Returns { offTopic: false } if the message seems in-scope,
 * or { offTopic: true, message: string } if it should be rejected immediately.
 */
export function checkIfOffTopic(text) {
  const t = String(text || '').trim()
  if (!t || t.length < 20 || CONVERSATIONAL_RE.test(t)) return { offTopic: false }

  // If any on-topic signal is present, let the full pipeline handle it.
  for (const re of ON_TOPIC_SIGNALS) {
    if (re.test(t)) return { offTopic: false }
  }

  // No on-topic signal found — check for a clear off-topic signal.
  for (const re of CLEAR_OFF_TOPIC_PATTERNS) {
    if (re.test(t)) return { offTopic: true, message: OFF_TOPIC_RESPONSE }
  }

  // Ambiguous — pass through; the system prompt instructs the LLM to decline.
  return { offTopic: false }
}

const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  /\b(?:patient|medical|record)\s*#?\s*:?\s*\d{5,}\b/i,
  /\b\d{2}\/\d{2}\/\d{4}\b/,
  /\b(?:mrn|account)\s*#?\s*:?\s*\d+/i,
]

const PII_PHRASES =
  /\b(?:my|our)\s+(?:full\s+)?name\s+is\b|\bsocial\s+security\b|\bssn\b|\bdate\s+of\s+birth\b|\bd\.?o\.?b\.?\b|\bstreet\s+address\b|\bhome\s+address\b|\bzip\s*code\b/i

/**
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function checkPatientMessageForPii(text) {
  const t = String(text || '').trim()
  if (!t) return { ok: true }
  if (PII_PHRASES.test(t)) {
    return {
      ok: false,
      message:
        'Please do not share personal details (name, address, date of birth, phone, email, IDs, or record numbers). Ask a general question about Active Surveillance or Observation instead, or speak with your care team about your own situation.',
    }
  }
  for (const re of PII_PATTERNS) {
    if (re.test(t)) {
      return {
        ok: false,
        message:
          'That message may include personal or identifying information. For your privacy, only ask general education questions here — no names, contact info, IDs, or dates of birth. Your care team can discuss your records with you directly.',
      }
    }
  }
  return { ok: true }
}
