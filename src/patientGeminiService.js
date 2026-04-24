/**
 * Patient education answers via Google Gemini, grounded in the institutional
 * Active Surveillance overview (OCR text) plus explicit EHR-style guardrails.
 *
 * Set VITE_GEMINI_API_KEY in .env (see .env.example). Without a key, callers
 * should use the local fallback matcher.
 */
import AS_OVERVIEW_KNOWLEDGE from './data/active_surveillance_overview_knowledge.txt?raw'
import { resolveLocalEducationAnswer } from './patientAnswerResolver.js'

// gemini-2.0-flash often shows limit: 0 on the free tier; 2.5 Flash matches current AI Studio quotas.
const GEMINI_MODEL = 'gemini-2.5-flash'

// ---------------------------------------------------------------------------
// Topic guardrails — pre-filter applied BEFORE calling the Gemini API.
// Two-layer strategy:
//   Layer 1 (this file): cheap keyword scan rejects obviously off-topic input.
//   Layer 2 (system prompt): LLM is instructed to refuse anything outside scope.
// ---------------------------------------------------------------------------

// Any of these signals suggest the message is prostate/AS-related → allow.
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

function buildSystemInstruction() {
  return `You are an educational assistant for patients learning about Active Surveillance (AS) and Observation (Watchful Waiting) for prostate cancer within the Mount Sinai Tewari Active Surveillance Program context.

## Role (EHR-adjacent guardrails)
- You provide general patient education only. You do not diagnose, prescribe, or replace the patient's urology/oncology team.
- If the user describes possible emergencies or severe symptoms (e.g., inability to urinate, new weakness or numbness, high fever with urinary symptoms, crushing chest pain, sudden confusion), tell them to call emergency services or go to the nearest ER immediately.
- Never ask the user to paste or confirm protected health information (PHI) such as full name, MRN, SSN, phone, email, full address, or exact dates of birth.
- If they ask what they personally should do based on their biopsy, PSA, imaging, or genetics, explain general concepts and direct them to their clinician for individualized decisions.
- STRICT SCOPE — you ONLY answer questions about: prostate cancer, active surveillance (AS), observation/watchful waiting, PSA testing, prostate biopsy, Gleason score / Grade Groups, treatment options for prostate cancer (surgery, radiation, focal therapy), urinary/sexual side effects of prostate treatment, anxiety and emotional coping with a prostate cancer diagnosis, diet/exercise/lifestyle for prostate cancer patients, imaging tests (MRI, PSMA PET, ExactVu micro-ultrasound), genomic testing (Decipher, Oncotype DX, Prolaris, ConfirmMDx), special pathologic findings (cribriform carcinoma, intraductal carcinoma / IDC-P, HGPIN, ASAP/ASIN), family history and inherited mutations (BRCA2, HOXB13), urinary/sexual function questionnaires (SHIM, IPSS), and shared decision-making for prostate cancer. If a question falls outside this scope — including other diseases, unrelated health topics, cooking, travel, weather, finance, sports, politics, entertainment, writing tasks, or any non-medical topic — respond ONLY with this exact sentence and nothing else: "I'm here specifically to answer questions about prostate cancer and active surveillance. For other topics, please speak with your care team or primary doctor."
- Tone: supportive, clear, plain language (about 8th–10th grade). Short paragraphs or bullets when helpful.

## Knowledge grounding
Ground answers primarily in the following patient handout text (Active Surveillance and Observation overview, aligned with NCCN, AUA, and EAU themes). Prefer paraphrasing or quoting concepts that appear in the handout; do not invent schedules, statistics, or institution-specific rules that are not supported by the text. If the handout does not clearly cover the question, say so briefly and suggest the patient discuss with their care team; you may add only cautious, general context that is typical of NCCN/AUA/EAU-style guidance and note that protocols vary by institution.

### Reference: Active Surveillance overview (patient guide text)
${AS_OVERVIEW_KNOWLEDGE.trim()}

## Closing habit
When appropriate, briefly remind the user that this chat is educational and not a substitute for their own doctor's advice.

## Conversation
If the patient sends follow-up messages, use earlier turns in this chat for context. Answer the latest question while staying consistent with what you already said when appropriate.`
}

const MAX_HISTORY_MESSAGES = 24

function userPart(text) {
  return {
    role: 'user',
    parts: [
      {
        text: `The patient asks (general education only; do not request identifiers):\n\n"""${text}"""`,
      },
    ],
  }
}

/**
 * @param {Array<{ role: string, text?: string, pending?: boolean }>} conversationHistory Prior turns only (exclude the new user message).
 * @returns {Array<{ role: string, parts: Array<{ text: string }> }>}
 */
function buildGeminiContentsFromHistory(conversationHistory, newUserText) {
  const contents = []
  const slice = conversationHistory
    .filter((m) => !(m.role === 'bot' && m.pending))
    .slice(-MAX_HISTORY_MESSAGES)

  for (const m of slice) {
    if (m.role === 'user') {
      const t = String(m.text || '').trim()
      if (!t) continue
      contents.push(userPart(t))
    } else if (m.role === 'bot') {
      const t = String(m.text || '').trim()
      if (!t) continue
      contents.push({ role: 'model', parts: [{ text: t }] })
    }
  }

  contents.push(userPart(newUserText))
  return contents
}

/**
 * @param {string} question
 * @param {{ getFallbackAnswer: (q: string) => string, conversationHistory?: Array<{ role: string, text?: string, pending?: boolean }>, structuredQa?: Array<{ q: string, a: string }>, skipPii?: boolean, skipLocal?: boolean }} opts
 * @returns {Promise<{ text: string, usedGemini: boolean, source?: string }>}
 */
export async function answerPatientEducationQuestion(question, opts) {
  const {
    getFallbackAnswer,
    conversationHistory = [],
    structuredQa = [],
    skipPii = false,
    skipLocal = false,
  } = opts
  const trimmed = String(question || '').trim()
  if (!skipPii) {
    const pii = checkPatientMessageForPii(trimmed)
    if (!pii.ok) {
      return { text: pii.message, usedGemini: false, source: 'privacy' }
    }
  }

  const topicCheck = checkIfOffTopic(trimmed)
  if (topicCheck.offTopic) {
    return { text: topicCheck.message, usedGemini: false, source: 'off-topic' }
  }

  if (!skipLocal) {
    const hasPriorConversation = conversationHistory.some(
      m => m.role === 'user' && String(m.text || '').trim()
    )
    const local = resolveLocalEducationAnswer(trimmed, structuredQa, { hasPriorConversation })
    if (local) {
      return { text: local.text, usedGemini: false, source: local.source }
    }
  }

  const apiKey = __VITE_GEMINI_API_KEY_INJECTED__
  if (!apiKey) {
    return { text: getFallbackAnswer(trimmed), usedGemini: false, source: 'fallback' }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`

  const body = {
    systemInstruction: {
      parts: [{ text: buildSystemInstruction() }],
    },
    contents: buildGeminiContentsFromHistory(conversationHistory, trimmed),
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 1200,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = data?.error?.message || res.statusText || 'Gemini request failed'
    return {
      text: `${getFallbackAnswer(trimmed)}\n\n—\n_(The live assistant was unavailable: ${err}.)_`,
      usedGemini: false,
      source: 'fallback',
    }
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') || ''

  if (!text.trim()) {
    return { text: getFallbackAnswer(trimmed), usedGemini: false, source: 'fallback' }
  }

  return { text: text.trim(), usedGemini: true, source: 'gemini' }
}
