/**
 * patientRecord.js — longitudinal patient record: an append-only, timestamped
 * clinical event stream.
 *
 * The rest of this app is snapshot-oriented (patientSession.js keys a blob per
 * clinic-assigned ID; progressionEngine.js keeps a roster of visit objects).
 * This module is the longitudinal substrate: every clinical observation is an
 * immutable event with a date, a type, and a typed payload. Derived numbers
 * (velocity, doubling time, protocol adherence) are computed from the stream,
 * never stored.
 *
 * Privacy: ids are locally generated, non-identifying (`pr_<base36>`). No name,
 * MRN, or DOB field exists in this schema by design. Everything lives in
 * localStorage on this device; every write is try/catch-wrapped and fails
 * silently (this repo has been bitten by quota / private-browsing failures).
 */

export const RECORD_SCHEMA_VERSION = 1
export const RECORD_STORE_KEY = 'as_patient_records_v1'
export const LEGACY_PSA_LOG_KEY = 'as_psa_log' // PSATracker's original flat log

// ─── Event types ──────────────────────────────────────────────────────────────
export const EVENT_TYPES = {
  PSA: 'psa',
  MRI: 'mri',
  BIOPSY: 'biopsy',
  GENOMICS: 'genomics',
  DRE: 'dre',
  UROFLOW: 'uroflow',
  NOTE: 'note',
}

export const EVENT_TYPE_LIST = Object.values(EVENT_TYPES)

export const EVENT_LABELS = {
  psa: 'PSA',
  mri: 'MRI',
  biopsy: 'Biopsy',
  genomics: 'Genomic test',
  dre: 'DRE',
  uroflow: 'Uroflow / PVR',
  note: 'Clinical note',
}

// Payload shapes (all fields optional unless noted; numbers or null, never NaN):
//   psa      { psa: number (required, > 0), volume: number|null }
//   mri      { pirads: 1-5|null, lesionCount: number|null, newLesion: boolean,
//              ecePresent: boolean|null, notes: string }
//   biopsy   { ggg: 1-5|null, positiveCores: number|null, totalCores: number|null,
//              maxCorePercent: 0-100|null, targeted: boolean, notes: string }
//   genomics { assay: 'decipher'|'gps'|'prolaris'|'confirmmdx'|'other',
//              score: number|null, riskCategory: string, notes: string }
//   dre      { finding: 'normal'|'abnormal'|'not_done', notes: string }
//   uroflow  { qmax: number|null, pvr: number|null, ipss: number|null, notes: string }
//   note     { status: 'on_surveillance'|'treated'|'watchful_waiting'|'other'|'',
//              text: string }

// ─── ID generation ────────────────────────────────────────────────────────────
function rand() {
  return Math.random().toString(36).slice(2, 10)
}

export function generateRecordId() {
  return `pr_${Date.now().toString(36)}_${rand()}`
}

export function generateEventId() {
  return `ev_${Date.now().toString(36)}_${rand()}`
}

// ─── Coercion helpers ─────────────────────────────────────────────────────────
export function num(v) {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

function bool(v) {
  return v === true || v === 'true' || v === 'yes'
}

function str(v) {
  return v === null || v === undefined ? '' : String(v)
}

// Normalize any date-ish input to an ISO date string (YYYY-MM-DD). Returns null
// if unparseable — callers drop the event rather than inventing a timestamp.
export function toISODate(v) {
  if (!v) return null
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  const d = new Date(v)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

// ─── Event construction / validation ─────────────────────────────────────────
export function normalizeEventPayload(type, raw) {
  const p = raw || {}
  switch (type) {
    case EVENT_TYPES.PSA:
      return { psa: num(p.psa), volume: num(p.volume) }
    case EVENT_TYPES.MRI:
      return {
        pirads: num(p.pirads),
        lesionCount: num(p.lesionCount),
        newLesion: bool(p.newLesion),
        ecePresent: p.ecePresent === null || p.ecePresent === undefined ? null : bool(p.ecePresent),
        notes: str(p.notes),
      }
    case EVENT_TYPES.BIOPSY:
      return {
        ggg: num(p.ggg),
        positiveCores: num(p.positiveCores),
        totalCores: num(p.totalCores),
        maxCorePercent: num(p.maxCorePercent),
        targeted: bool(p.targeted),
        notes: str(p.notes),
      }
    case EVENT_TYPES.GENOMICS:
      return {
        assay: str(p.assay) || 'other',
        score: num(p.score),
        riskCategory: str(p.riskCategory),
        notes: str(p.notes),
      }
    case EVENT_TYPES.DRE:
      return {
        finding: ['normal', 'abnormal', 'not_done'].includes(p.finding) ? p.finding : 'not_done',
        notes: str(p.notes),
      }
    case EVENT_TYPES.UROFLOW:
      return { qmax: num(p.qmax), pvr: num(p.pvr), ipss: num(p.ipss), notes: str(p.notes) }
    case EVENT_TYPES.NOTE:
      return { status: str(p.status), text: str(p.text) }
    default:
      return { ...p }
  }
}

// Returns a well-formed event, or null when it cannot be trusted (unknown type,
// unparseable date, PSA event without a usable value).
export function makeEvent(type, date, payload, meta) {
  if (!EVENT_TYPE_LIST.includes(type)) return null
  const iso = toISODate(date)
  if (!iso) return null
  const data = normalizeEventPayload(type, payload)
  if (type === EVENT_TYPES.PSA && !(data.psa > 0)) return null
  return {
    id: (meta && meta.id) || generateEventId(),
    type,
    date: iso,
    recordedAt: (meta && meta.recordedAt) || new Date().toISOString(),
    data,
  }
}

// ─── Record construction ──────────────────────────────────────────────────────
export function newPatientRecord(label = '') {
  const now = new Date().toISOString()
  return {
    schemaVersion: RECORD_SCHEMA_VERSION,
    id: generateRecordId(),
    label: label || '',           // clinician-chosen non-identifying label
    enrollmentDate: '',           // ISO date AS surveillance began
    baseline: {
      ggg: null,                  // Grade Group at enrollment
      prostateVolume: null,       // cc
      ageAtEnrollment: null,
    },
    events: [],                   // append-only, see makeEvent
    createdAt: now,
    updatedAt: now,
  }
}

// Sort is stable by date then recordedAt; the stream is append-only, so ordering
// is a read concern, not a write concern.
export function sortedEvents(record, type) {
  const list = (record && Array.isArray(record.events) ? record.events : [])
    .filter(ev => ev && ev.date && (!type || ev.type === type))
  return [...list].sort((a, b) => {
    const d = new Date(a.date) - new Date(b.date)
    if (d !== 0) return d
    return String(a.recordedAt || '').localeCompare(String(b.recordedAt || ''))
  })
}

export function appendEvent(record, event) {
  if (!record || !event) return record
  return {
    ...record,
    events: [...(record.events || []), event],
    updatedAt: new Date().toISOString(),
  }
}

// Removal is an explicit correction, not part of the normal flow — the stream
// is append-only in intent, but a typo entered by a clinician must be fixable.
export function removeEvent(record, eventId) {
  if (!record) return record
  return {
    ...record,
    events: (record.events || []).filter(ev => ev.id !== eventId),
    updatedAt: new Date().toISOString(),
  }
}

// PSA series in the shape derivedMetrics / progressionEngine expect.
export function psaSeries(record) {
  return sortedEvents(record, EVENT_TYPES.PSA)
    .filter(ev => ev.data && ev.data.psa > 0)
    .map(ev => ({ id: ev.id, date: ev.date, psa: ev.data.psa, volume: ev.data.volume ?? null }))
}

export function latestEvent(record, type) {
  const list = sortedEvents(record, type)
  return list.length ? list[list.length - 1] : null
}

// ─── Migration / normalization of untrusted input ────────────────────────────
export function normalizeRecord(raw) {
  if (!raw || typeof raw !== 'object') return null
  const base = newPatientRecord(str(raw.label))
  const events = []
  if (Array.isArray(raw.events)) {
    for (const ev of raw.events) {
      if (!ev || typeof ev !== 'object') continue
      const made = makeEvent(ev.type, ev.date, ev.data, { id: ev.id, recordedAt: ev.recordedAt })
      if (made) events.push(made)
    }
  }
  return {
    ...base,
    schemaVersion: RECORD_SCHEMA_VERSION,
    id: str(raw.id) || base.id,
    label: str(raw.label),
    enrollmentDate: toISODate(raw.enrollmentDate) || '',
    baseline: {
      ggg: num(raw.baseline && raw.baseline.ggg),
      prostateVolume: num(raw.baseline && raw.baseline.prostateVolume),
      ageAtEnrollment: num(raw.baseline && raw.baseline.ageAtEnrollment),
    },
    events,
    createdAt: str(raw.createdAt) || base.createdAt,
    updatedAt: str(raw.updatedAt) || base.updatedAt,
  }
}

export function emptyStore() {
  return { schemaVersion: RECORD_SCHEMA_VERSION, records: [], activeId: null }
}

export function normalizeStore(raw) {
  if (!raw || typeof raw !== 'object') return emptyStore()
  const records = (Array.isArray(raw.records) ? raw.records : [])
    .map(normalizeRecord)
    .filter(Boolean)
  const activeId = records.some(r => r.id === raw.activeId) ? raw.activeId : (records[0]?.id ?? null)
  return { schemaVersion: RECORD_SCHEMA_VERSION, records, activeId }
}

// Fold PSATracker's legacy flat `as_psa_log` array into a starter record so no
// previously entered data is lost when a device first sees this schema.
export function migrateLegacyPSALog() {
  let legacy = null
  try {
    const raw = localStorage.getItem(LEGACY_PSA_LOG_KEY)
    legacy = raw ? JSON.parse(raw) : null
  } catch (_) { return null }
  if (!Array.isArray(legacy) || legacy.length === 0) return null

  let record = newPatientRecord('Imported PSA log')
  for (const en of legacy) {
    const ev = makeEvent(EVENT_TYPES.PSA, en && en.date, { psa: en && en.psa, volume: en && en.volume })
    if (ev) record = appendEvent(record, ev)
  }
  return record.events.length ? record : null
}

// ─── Persistence (every write silently tolerant of failure) ──────────────────
export function loadStore() {
  let parsed = null
  try {
    const raw = localStorage.getItem(RECORD_STORE_KEY)
    if (raw) parsed = JSON.parse(raw)
  } catch (_) { parsed = null }

  if (parsed) return normalizeStore(parsed)

  const migrated = migrateLegacyPSALog()
  if (migrated) {
    const store = { schemaVersion: RECORD_SCHEMA_VERSION, records: [migrated], activeId: migrated.id }
    saveStore(store)
    return store
  }
  return emptyStore()
}

// Returns true if the write landed, false if storage rejected it. Callers may
// surface that, but nothing throws.
export function saveStore(store) {
  try {
    localStorage.setItem(RECORD_STORE_KEY, JSON.stringify(store))
    return true
  } catch (_) {
    return false
  }
}

export function getActiveRecord(store) {
  if (!store || !store.records || !store.records.length) return null
  return store.records.find(r => r.id === store.activeId) || store.records[0] || null
}

export function upsertRecord(store, record) {
  const base = store && store.records ? store : emptyStore()
  const idx = base.records.findIndex(r => r.id === record.id)
  const records = idx >= 0
    ? base.records.map((r, i) => (i === idx ? record : r))
    : [...base.records, record]
  return { ...base, schemaVersion: RECORD_SCHEMA_VERSION, records, activeId: record.id }
}

export function deleteRecord(store, id) {
  const base = store && store.records ? store : emptyStore()
  const records = base.records.filter(r => r.id !== id)
  const activeId = base.activeId === id ? (records[0]?.id ?? null) : base.activeId
  return { ...base, records, activeId }
}

// ─── JSON import / export (lossless round-trip) ──────────────────────────────
export function exportRecordJSON(recordOrStore) {
  const payload = recordOrStore && recordOrStore.records
    ? { schemaVersion: RECORD_SCHEMA_VERSION, kind: 'store', ...recordOrStore }
    : { schemaVersion: RECORD_SCHEMA_VERSION, kind: 'record', ...recordOrStore }
  return JSON.stringify(payload, null, 2)
}

// Returns { ok, kind, store?, record?, error }
export function importRecordJSON(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (_) {
    return { ok: false, error: 'Not valid JSON.' }
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'Unrecognized JSON structure.' }

  if (Array.isArray(parsed.records)) {
    const store = normalizeStore(parsed)
    if (!store.records.length) return { ok: false, error: 'No usable patient records found in file.' }
    return { ok: true, kind: 'store', store }
  }
  if (Array.isArray(parsed.events)) {
    const record = normalizeRecord(parsed)
    if (!record) return { ok: false, error: 'Unrecognized JSON structure.' }
    return { ok: true, kind: 'record', record }
  }
  return { ok: false, error: 'Unrecognized JSON structure — expected a record or a record store.' }
}

export function downloadJSON(text, filename) {
  try {
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return true
  } catch (_) {
    return false
  }
}

export function formatEventDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch (_) { return iso }
}
