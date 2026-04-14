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
- Stay on topic: localized prostate cancer, AS, observation, testing cadence, side effects, anxiety/coping, and shared decision-making. Politely decline unrelated medical or non-medical topics.
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
