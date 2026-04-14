/**
 * Local answer resolution: patient handout text first, then curated QA, then (caller) Gemini.
 */
import AS_OVERVIEW_KNOWLEDGE from './data/active_surveillance_overview_knowledge.txt?raw'

export const GENERIC_FALLBACK_MESSAGE =
  "I don't have a specific answer for that question yet. Please speak with your care team or try rephrasing your question."

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'her',
  'was',
  'one',
  'our',
  'out',
  'day',
  'get',
  'has',
  'him',
  'his',
  'how',
  'its',
  'may',
  'new',
  'now',
  'old',
  'see',
  'two',
  'way',
  'who',
  'boy',
  'did',
  'she',
  'use',
  'her',
  'many',
  'than',
  'them',
  'some',
  'what',
  'when',
  'will',
  'with',
  'have',
  'this',
  'that',
  'from',
  'your',
  'into',
  'more',
  'such',
  'also',
  'any',
  'been',
  'each',
  'does',
  'must',
  'same',
  'tell',
  'very',
  'just',
  'know',
  'take',
  'year',
  'come',
  'could',
  'would',
  'about',
  'after',
  'their',
  'there',
  'these',
  'which',
  'should',
  'other',
  'being',
  'those',
  'during',
  'before',
  'while',
])

function questionKeywords(question) {
  const raw = String(question || '')
    .toLowerCase()
    .match(/\b[a-z]{3,}\b/g)
  if (!raw) return []
  return [...new Set(raw.filter(w => !STOPWORDS.has(w)))]
}

function isReferenceOrDisclaimerChunk(text) {
  const t = text.trim()
  if (/^References\s*$/m.test(t)) return true
  if (/^Disclaimer: This guide is for educational purposes only/i.test(t) && t.length > 400) return true
  if (/^===== PAGE /m.test(t) && t.length < 30) return true
  return false
}

/**
 * Title / cover lines that match almost every question (surveillance, prostate, etc.) but carry no real answer.
 */
function isBoilerplateTitleChunk(text) {
  const raw = text.trim()
  const t = raw.replace(/^===== PAGE [^\n]+ =====\s*/im, '').trim()
  if (!t) return true
  if (/^A Patient Guide Based on NCCN, AUA, and EAU Guidelines\s*$/i.test(t)) return true
  if (
    /^Active Surveillance and Observation in Prostate Cancer(\s*\n\s*A Patient Guide Based on NCCN, AUA, and EAU Guidelines)?\s*$/is.test(
      t
    )
  ) {
    return true
  }
  // Page line glued to title only (no body sentences)
  if (
    /^===== PAGE [^\n]+ =====\s*\n\s*Active Surveillance and Observation in Prostate Cancer\s*$/is.test(
      raw
    )
  ) {
    return true
  }
  return false
}

function scorePassage(lower, keywords) {
  return keywords.reduce((n, w) => (lower.includes(w) ? n + 1 : n), 0)
}

/** Terms so common in this handout that matching them alone is a weak signal */
const GENERIC_HANDOUT_TERMS = new Set([
  'surveillance',
  'observation',
  'prostate',
  'cancer',
  'active',
  'patient',
  'patients',
  'treatment',
  'disease',
  'doctor',
  'doctors',
  'health',
  'care',
  'life',
  'risk',
  'men',
  'watchful',
  'waiting',
  'option',
  'options',
  'testing',
  'test',
  'tests',
  'biopsy',
  'biopsies',
])

function stripPageMarkersForHandout(text) {
  return text
    .replace(/^===== PAGE [^\n]+ =====\s*/gim, '')
    .replace(/\n===== PAGE [^\n]+ =====\s*/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Best-matching excerpt from the institutional handout (OCR text).
 * Uses 1–3 paragraph windows so section headings stay with their body.
 * @returns {string | null}
 */
export function findOverviewDocAnswer(question) {
  const keywords = questionKeywords(question)
  if (keywords.length === 0) return null

  const allParas = AS_OVERVIEW_KNOWLEDGE.trim()
    .split(/\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean)
  const n = allParas.length

  let bestMerged = null
  let bestScore = 0
  let bestLen = 0

  for (let w = 1; w <= 3; w++) {
    for (let i = 0; i + w <= n; i++) {
      const window = allParas.slice(i, i + w)
      if (window.some(p => isReferenceOrDisclaimerChunk(p) || isBoilerplateTitleChunk(p))) continue

      const merged = window.join('\n\n').trim()
      if (merged.length < 90) continue
      if (window.every(p => p.length < 52)) continue

      const lower = merged.toLowerCase()
      let score = scorePassage(lower, keywords)
      const head = lower.slice(0, 380)
      const headHits = keywords.filter(kw => head.includes(kw)).length
      if (headHits >= 2) score += 1
      else if (keywords.length === 1 && headHits === 1) score += 1

      const beats =
        score > bestScore ||
        (score === bestScore && score > 0 && merged.length > bestLen)
      if (beats) {
        bestScore = score
        bestMerged = merged
        bestLen = merged.length
      }
    }
  }

  let need =
    keywords.length === 1
      ? 1
      : Math.max(2, Math.ceil(keywords.length * 0.4))
  const hasSpecificTerm = keywords.some(k => !GENERIC_HANDOUT_TERMS.has(k))
  if (!hasSpecificTerm && keywords.length <= 5) {
    need = Math.max(need, Math.ceil(keywords.length * 0.65))
  }
  if (!bestMerged || bestScore < need) return null

  let text = stripPageMarkersForHandout(bestMerged)
  if (text.length > 4200) text = `${text.slice(0, 4200).trim()}…`
  return text
}

function normalizeQueryToken(w) {
  return String(w || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Curated Q&A — exact question text only (highest accuracy).
 * @param {string} question
 * @param {Array<{ q: string, a: string }>} allQa
 * @returns {string | null}
 */
export function findStructuredQaExact(question, allQa) {
  const list = allQa || []
  if (list.length === 0) return null
  const q = String(question || '')
    .toLowerCase()
    .trim()
  const exact = list.find(item => item.q.toLowerCase() === q)
  return exact ? exact.a : null
}

/**
 * Curated Q&A — fuzzy match (stricter than before to reduce wrong-topic answers).
 * @param {string} question
 * @param {Array<{ q: string, a: string }>} allQa
 * @returns {string | null}
 */
export function findStructuredQaFuzzy(question, allQa) {
  const list = allQa || []
  if (list.length === 0) return null
  const q = String(question || '')
    .toLowerCase()
    .trim()
  const queryTerms = [
    ...new Set(
      q
        .split(/\s+/)
        .map(normalizeQueryToken)
        .filter(t => t.length >= 3 && !STOPWORDS.has(t))
    ),
  ]
  if (queryTerms.length === 0) return null

  const scored = list
    .map(item => {
      const iq = item.q.toLowerCase()
      const ia = item.a.toLowerCase()
      let score = 0
      for (const term of queryTerms) {
        if (iq.includes(term) || ia.includes(term)) score++
      }
      if (q.length >= 14 && iq.length >= 14) {
        const take = Math.min(32, q.length, iq.length)
        if (take >= 14 && iq.includes(q.slice(0, take))) score += 2
      }
      return { item, score }
    })
    .sort((a, b) => b.score - a.score)

  const top = scored[0]
  if (!top || top.score < 1) return null
  if (top.score >= 2) return top.item.a

  const tiedAtTop = scored.filter(s => s.score === top.score).length
  if (tiedAtTop > 1) return null

  if (top.score === 1 && queryTerms.length === 1) {
    const t = queryTerms[0]
    if (t.length >= 3) return top.item.a
  }

  return null
}

/**
 * Exact match, then fuzzy (for legacy callers / offline fallback text).
 * @param {string} question
 * @param {Array<{ q: string, a: string }>} allQa
 * @returns {string | null}
 */
export function findStructuredQaAnswer(question, allQa) {
  return findStructuredQaExact(question, allQa) || findStructuredQaFuzzy(question, allQa)
}

/**
 * @param {string} question
 * @param {Array<{ q: string, a: string }>} allQa
 * @param {{ hasPriorConversation?: boolean }} [opts]
 * @returns {{ text: string, source: 'doc' | 'qa' } | null}
 */
export function resolveLocalEducationAnswer(question, allQa, opts = {}) {
  const trimmed = String(question || '').trim()
  const kw = questionKeywords(trimmed)
  const shortFollowUp =
    !!opts.hasPriorConversation && kw.length <= 1 && trimmed.length < 45

  if (shortFollowUp) {
    const exact = findStructuredQaExact(trimmed, allQa)
    if (exact) return { text: exact, source: 'qa' }
    const fuzzy = findStructuredQaFuzzy(trimmed, allQa)
    if (fuzzy) return { text: fuzzy, source: 'qa' }
    return null
  }

  const exactQa = findStructuredQaExact(trimmed, allQa)
  if (exactQa) return { text: exactQa, source: 'qa' }

  const fromDoc = findOverviewDocAnswer(trimmed)
  if (fromDoc) return { text: fromDoc, source: 'doc' }

  const fuzzyQa = findStructuredQaFuzzy(trimmed, allQa)
  if (fuzzyQa) return { text: fuzzyQa, source: 'qa' }

  return null
}
