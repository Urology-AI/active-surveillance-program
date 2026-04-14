/**
 * Patient education answers via Google Gemini, grounded in the institutional
 * Active Surveillance overview (OCR text) plus explicit EHR-style guardrails.
 *
 * Set VITE_GEMINI_API_KEY in .env (see .env.example). Without a key, callers
 * should use the local fallback matcher.
 */
import AS_OVERVIEW_KNOWLEDGE from './data/active_surveillance_overview_knowledge.txt?raw'

const GEMINI_MODEL = 'gemini-2.0-flash'

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
Ground answers primarily in the following patient handout text (Active Surveillance and Observation overview, aligned with NCCN, AUA, and EAU themes). If the handout does not cover a question, you may add careful, general educational context consistent with those guideline families, and note that protocols vary by institution.

### Reference: Active Surveillance overview (patient guide text)
${AS_OVERVIEW_KNOWLEDGE.trim()}

## Closing habit
When appropriate, briefly remind the user that this chat is educational and not a substitute for their own doctor's advice.`
}

/**
 * @param {string} question
 * @param {{ getFallbackAnswer: (q: string) => string }} opts
 * @returns {Promise<{ text: string, usedGemini: boolean }>}
 */
export async function answerPatientEducationQuestion(question, { getFallbackAnswer }) {
  const trimmed = String(question || '').trim()
  const pii = checkPatientMessageForPii(trimmed)
  if (!pii.ok) {
    return { text: pii.message, usedGemini: false }
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    return { text: getFallbackAnswer(trimmed), usedGemini: false }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`

  const body = {
    systemInstruction: {
      parts: [{ text: buildSystemInstruction() }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `The patient asks (general education only; do not request identifiers):\n\n"""${trimmed}"""`,
          },
        ],
      },
    ],
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
      text: `${getFallbackAnswer(trimmed)}\n\n—\n_(The live assistant was unavailable: ${err}. The note above is from our offline topics.)_`,
      usedGemini: false,
    }
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') || ''

  if (!text.trim()) {
    return { text: getFallbackAnswer(trimmed), usedGemini: false }
  }

  return { text: text.trim(), usedGemini: true }
}
