/**
 * patientSession.js — lightweight localStorage-backed patient session store.
 *
 * A "Patient ID" here is a clinic-assigned alphanumeric code chosen by the
 * clinician for longitudinal tracking — NOT a name or MRN. Sessions are
 * keyed by that ID and stored only on this device.
 */

const SESSION_PREFIX = 'as_patient_session_'
const VISIT_LOG_KEY  = 'as_visit_summaries'

function normalizeId(patientId) {
  return (patientId || '').trim()
}

function sessionKey(patientId) {
  return SESSION_PREFIX + normalizeId(patientId)
}

export function hasSession(patientId) {
  const id = normalizeId(patientId)
  if (!id) return false
  try { return localStorage.getItem(sessionKey(id)) != null } catch (_) { return false }
}

export function loadSession(patientId) {
  const id = normalizeId(patientId)
  if (!id) return null
  try {
    const raw = localStorage.getItem(sessionKey(id))
    return raw ? JSON.parse(raw) : null
  } catch (_) { return null }
}

export function saveSession(patientId, data) {
  const id = normalizeId(patientId)
  if (!id) return null
  try {
    const existing = loadSession(id) || {}
    const next = { ...existing, ...data, patientId: id, updatedAt: new Date().toISOString() }
    localStorage.setItem(sessionKey(id), JSON.stringify(next))
    return next
  } catch (_) { return null }
}

// Returns PSA history sorted oldest → newest, limited to the most recent `limit` entries.
export function getPSAHistory(patientId, limit = 3) {
  const session = loadSession(patientId)
  if (!session || !Array.isArray(session.psaHistory)) return []
  return [...session.psaHistory]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-limit)
}

export function addPSAEntry(patientId, entry) {
  const id = normalizeId(patientId)
  if (!id || !entry || !entry.date || entry.psa == null) return null
  const session = loadSession(id) || { patientId: id, psaHistory: [] }
  const psaHistory = [...(session.psaHistory || []), entry]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  return saveSession(id, { psaHistory })
}

export function saveVisitSummary(record) {
  try {
    const raw  = localStorage.getItem(VISIT_LOG_KEY)
    const list = raw ? JSON.parse(raw) : []
    list.push(record)
    localStorage.setItem(VISIT_LOG_KEY, JSON.stringify(list))
  } catch (_) {}

  const id = normalizeId(record && record.patientId)
  if (!id) return

  const session = loadSession(id) || { patientId: id, psaHistory: [], visits: [] }
  const visits  = [...(session.visits || []), record]

  let psaHistory = session.psaHistory || []
  const psaNum = record.psaValue != null && record.psaValue !== '' ? Number(record.psaValue) : null
  const psadNum = record.psad != null && record.psad !== '' ? Number(record.psad) : null
  if (psaNum != null && !isNaN(psaNum)) {
    const volume = psadNum && psadNum > 0 ? psaNum / psadNum : undefined
    psaHistory = [...psaHistory, {
      date: record.visitDate || new Date().toISOString().slice(0, 10),
      psa: psaNum,
      ...(volume ? { volume } : {}),
    }]
  }

  saveSession(id, { visits, psaHistory })
}
