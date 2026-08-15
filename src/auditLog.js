/**
 * auditLog.js — append-only local record of every assessment run.
 *
 * PURPOSE
 *  1. Regulatory evidence trail: for an FDA SaMD clinical decision support
 *     pathway, every recommendation shown to a clinician must be reconstructable
 *     — the exact inputs, the exact engine output, and the exact model version
 *     that produced it.
 *  2. Validation dataset: the same records form the retrospective/prospective
 *     validation corpus once exported and analysed offline.
 *
 * ⚠️  PRIVACY / DEPLOYMENT WARNING — READ BEFORE RELYING ON THIS MODULE
 *  · This log NEVER leaves the browser. Nothing here transmits data anywhere.
 *  · Browser localStorage is NOT an acceptable PHI store. It is unencrypted,
 *    unauthenticated, readable by any script on the origin, shared across all
 *    users of the same browser profile, and silently evictable.
 *  · A real deployment MUST replace this with server-side, access-controlled,
 *    encrypted, tamper-evident audit storage with per-user attribution and
 *    retention policy (21 CFR Part 11 / HIPAA expectations).
 *  · Consequently this module stores only the clinical variables the calculator
 *    already handles; do not extend it to capture direct identifiers (name,
 *    MRN, DOB) while it remains localStorage-backed.
 *
 * ROBUSTNESS
 *  This repo has previously been bitten by localStorage quota and private-
 *  browsing failures. Every read and write here is wrapped in try/catch and
 *  fails silently — an audit-log failure must never break an assessment.
 */

import { MODEL_PROVENANCE, ENGINE_VERSION } from './modelVersion.js'

const LOG_KEY        = 'as_assessment_audit_log_v1'
const SESSION_KEY    = 'as_audit_session_id_v1'
const MAX_ENTRIES    = 500   // FIFO cap — oldest evicted first
const AUDIT_SCHEMA   = 1

/** Random, non-identifying session id, stable for this browser profile. */
function makeId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch (_) { /* fall through */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Stable random session id. Persisted when possible; if storage is unavailable
 * (private browsing / quota) an in-memory id is used for the page lifetime.
 */
let memorySessionId = null
export function getSessionId() {
  try {
    const existing = localStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const next = makeId()
    localStorage.setItem(SESSION_KEY, next)
    return next
  } catch (_) {
    if (!memorySessionId) memorySessionId = makeId()
    return memorySessionId
  }
}

/** Read the whole log. Returns [] on any failure or malformed content. */
export function readAuditLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (_) {
    return []
  }
}

/** Persist the log, trimming FIFO on quota errors. Never throws. */
function writeAuditLog(entries) {
  let list = entries.slice(-MAX_ENTRIES)
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(list))
      return true
    } catch (_) {
      // Quota exceeded (or storage unavailable) — drop the oldest half and retry.
      if (list.length <= 1) return false
      list = list.slice(Math.ceil(list.length / 2))
    }
  }
  return false
}

/**
 * Append one assessment to the audit log.
 *
 * Captured per record:
 *   auditSchema    — schema version of this record shape
 *   id             — random record id
 *   sessionId      — stable random browser-session id (non-identifying)
 *   timestamp      — ISO 8601 UTC time the assessment was run
 *   context        — free-form origin label, e.g. 'clinical-calculator'
 *   engineVersion  — semantic version of asEngine at run time
 *   modelProvenance— full provenance block (cohort, data cut, guideline editions)
 *   inputs         — complete input object passed to runAssessment()
 *   output         — complete result object returned by runAssessment()
 *
 * Returns the record (or null if it could not be persisted). Never throws.
 */
export function appendAuditRecord({ inputs, output, context = 'clinical-calculator' } = {}) {
  try {
    const record = {
      auditSchema:     AUDIT_SCHEMA,
      id:              makeId(),
      sessionId:       getSessionId(),
      timestamp:       new Date().toISOString(),
      context,
      engineVersion:   ENGINE_VERSION,
      modelProvenance: MODEL_PROVENANCE,
      inputs:          safeClone(inputs),
      output:          safeClone(output),
    }
    const ok = writeAuditLog([...readAuditLog(), record])
    return ok ? record : null
  } catch (_) {
    return null
  }
}

/** Structured-clone-ish deep copy that tolerates non-serialisable values. */
function safeClone(value) {
  try {
    return JSON.parse(JSON.stringify(value ?? null))
  } catch (_) {
    return null
  }
}

/** Full log wrapped with export metadata, ready for offline analysis. */
export function buildAuditExport() {
  const entries = readAuditLog()
  return {
    exportType:      'as-assessment-audit-log',
    auditSchema:     AUDIT_SCHEMA,
    exportedAt:      new Date().toISOString(),
    sessionId:       getSessionId(),
    engineVersion:   ENGINE_VERSION,
    modelProvenance: MODEL_PROVENANCE,
    entryCount:      entries.length,
    maxEntries:      MAX_ENTRIES,
    privacyNotice:
      'Local browser audit log. Not a PHI-grade store — production deployments ' +
      'require server-side, access-controlled, tamper-evident audit storage.',
    entries,
  }
}

/** JSON string of the whole log. */
export function exportAuditLogJSON() {
  try {
    return JSON.stringify(buildAuditExport(), null, 2)
  } catch (_) {
    return JSON.stringify({ exportType: 'as-assessment-audit-log', entries: [] })
  }
}

/** Trigger a browser download of the audit log. No-op outside a browser. */
export function downloadAuditLog() {
  try {
    const blob = new Blob([exportAuditLogJSON()], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `as-audit-log-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch (_) {
    return false
  }
}

/** Number of records currently held. */
export function auditLogSize() {
  return readAuditLog().length
}

/**
 * Clear the log. Intentionally NOT wired into normal UI — an append-only trail
 * should not be user-erasable in a regulated deployment. Exposed for tests and
 * local development only.
 */
export function clearAuditLog() {
  try { localStorage.removeItem(LOG_KEY); return true } catch (_) { return false }
}

export const AUDIT_LOG_MAX_ENTRIES = MAX_ENTRIES
