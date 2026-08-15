/**
 * progressionEngine.js — Longitudinal progression detection for AS patients
 *
 * AUA/NCCN trigger criteria implemented here:
 *  · Grade Group upgrade on repeat biopsy (primary endpoint)
 *  · PSA doubling time < 3 years (PRIAS exit criterion)
 *  · PSA velocity > 0.75 ng/mL/yr
 *  · New PI-RADS 4–5 lesion or radiographic progression
 *  · DRE change (new palpable nodule)
 *
 * Cohort calibration uses N=1,213 Mount Sinai Tewari AS Program data
 * (same source as asEngine.js COHORT_CALIBRATION).
 */

export const PROGRESSION_STORAGE_KEY  = 'as_progression_data'   // legacy single-patient key
export const ROSTER_STORAGE_KEY       = 'as_progression_roster'  // multi-patient roster

// ─── Patient ID generator ─────────────────────────────────────────────────────
export function generatePatientId() {
  return `pt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ─── Roster helpers ───────────────────────────────────────────────────────────
export function loadRoster() {
  try {
    const raw = localStorage.getItem(ROSTER_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  // Migrate legacy single-patient data if it exists
  const legacy = loadProgressionData()
  if (legacy) {
    const migrated = {
      patients: [{ ...legacy, id: generatePatientId(), label: 'Patient 1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      activeId: null,
    }
    migrated.activeId = migrated.patients[0].id
    saveRoster(migrated)
    try { localStorage.removeItem(PROGRESSION_STORAGE_KEY) } catch (_) {}
    return migrated
  }
  return { patients: [], activeId: null }
}

export function saveRoster(roster) {
  try {
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify({ ...roster, updatedAt: new Date().toISOString() }))
  } catch (_) {}
}

export function getActivePatient(roster) {
  if (!roster?.patients?.length) return null
  return roster.patients.find(p => p.id === roster.activeId) ?? roster.patients[0] ?? null
}

export function upsertPatient(roster, patient) {
  const now = new Date().toISOString()
  const existing = roster.patients.findIndex(p => p.id === patient.id)
  const updated = { ...patient, updatedAt: now }
  const patients = existing >= 0
    ? roster.patients.map((p, i) => i === existing ? updated : p)
    : [...roster.patients, { ...updated, createdAt: now }]
  return { ...roster, patients, activeId: patient.id }
}

export function deletePatient(roster, id) {
  const patients = roster.patients.filter(p => p.id !== id)
  const activeId = roster.activeId === id
    ? (patients[0]?.id ?? null)
    : roster.activeId
  return { ...roster, patients, activeId }
}

export function newPatientRecord(label = '') {
  return {
    ...defaultProgressionData(),
    id: generatePatientId(),
    label: label || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Export roster or single patient as a downloadable JSON file
export function exportJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// Export one patient or entire roster as a CSV (one row per visit)
export function exportCSV(patientsOrPatient, filename) {
  const patients = Array.isArray(patientsOrPatient)
    ? patientsOrPatient
    : patientsOrPatient.patients
      ? patientsOrPatient.patients
      : [patientsOrPatient]

  const cols = [
    'patient_id', 'patient_label',
    'enrollment_date', 'enrollment_gg', 'enrollment_psa', 'prostate_volume_cc', 'age', 'race',
    'visit_id', 'visit_date',
    'psa', 'visit_prostate_volume',
    'biopsy_gg', 'biopsy_total_cores', 'biopsy_positive_cores',
    'mri_pirads', 'mri_new_lesion', 'mri_notes',
    'dre', 'notes',
  ]

  function esc(v) {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const rows = [cols.join(',')]
  for (const pt of patients) {
    const base = [
      pt.id ?? '', pt.label ?? '',
      pt.enrollmentDate ?? '', pt.enrollmentGG ?? '', pt.enrollmentPSA ?? '',
      pt.prostateVolume ?? '', pt.age ?? '', pt.race ?? '',
    ]
    const visits = pt.visits ?? []
    if (visits.length === 0) {
      rows.push([...base, '', '', '', '', '', '', '', '', '', '', '', '', ''].map(esc).join(','))
    } else {
      for (const v of visits) {
        rows.push([
          ...base,
          v.id ?? '', v.date ?? '',
          v.psa ?? '', v.prostateVolume ?? '',
          v.biopsy?.gg ?? '', v.biopsy?.totalCores ?? '', v.biopsy?.positiveCores ?? '',
          v.mri?.pirads ?? '', v.mri?.newLesion != null ? (v.mri.newLesion ? 'yes' : 'no') : '',
          v.mri?.notes ?? '',
          v.dre ?? '', v.notes ?? '',
        ].map(esc).join(','))
      }
    }
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// Parse imported JSON — returns { ok, data, error }
export function parseImportJSON(text) {
  try {
    const data = JSON.parse(text)
    // Accept roster export ({ patients: [...] }) or single patient record
    if (data.patients && Array.isArray(data.patients)) return { ok: true, type: 'roster', data }
    if (data.enrollmentDate !== undefined || data.id) return { ok: true, type: 'patient', data }
    return { ok: false, error: 'Unrecognized JSON structure.' }
  } catch (_) {
    return { ok: false, error: 'Invalid JSON file.' }
  }
}

// ─── Default data shape ───────────────────────────────────────────────────────
export function defaultProgressionData() {
  return {
    enrollmentDate: '',       // ISO date string
    enrollmentGG: 1,          // Grade Group at enrollment (1–5)
    enrollmentPSA: '',        // ng/mL
    prostateVolume: '',       // cc — for PSAD
    age: '',                  // years at enrollment
    race: 'unknown',          // 'caucasian' | 'african_american' | 'other' | 'unknown'
    visits: [],               // array of VisitEntry (see below)
  }
}

// VisitEntry shape:
// {
//   id: string,
//   date: ISO string,
//   psa: number | null,
//   prostateVolume: number | null,   // if measured at this visit
//   biopsy: null | { gg: number, totalCores: number | null, positiveCores: number | null },
//   mri: null | { pirads: number | null, newLesion: boolean, notes: string },
//   dre: 'normal' | 'abnormal' | 'not_done' | null,
//   notes: string,
// }

// ─── PSA doubling time (log-linear regression, returns months) ────────────────
export function computePSADT(psaPoints) {
  // psaPoints: [{ date: ISO, psa: number }]
  if (!psaPoints || psaPoints.length < 2) return null
  const sorted = [...psaPoints]
    .filter(p => p.psa > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  if (sorted.length < 2) return null

  const t0 = new Date(sorted[0].date).getTime()
  const pts = sorted.map(p => ({
    x: (new Date(p.date).getTime() - t0) / (1000 * 60 * 60 * 24 * 30.44),
    y: Math.log(p.psa),
  }))

  const n = pts.length
  const sumX  = pts.reduce((s, p) => s + p.x, 0)
  const sumY  = pts.reduce((s, p) => s + p.y, 0)
  const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (Math.abs(denom) < 1e-10) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  if (slope <= 0) return null
  return Math.log(2) / slope
}

// ─── PSA velocity (ng/mL/yr, annualized slope) ───────────────────────────────
export function computePSAVelocity(psaPoints) {
  if (!psaPoints || psaPoints.length < 2) return null
  const sorted = [...psaPoints]
    .filter(p => p.psa > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  if (sorted.length < 2) return null

  const first = sorted[0]
  const last  = sorted[sorted.length - 1]
  const years = (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24 * 365.25)
  if (years < 0.08) return null // < ~1 month gap — not meaningful
  return (last.psa - first.psa) / years
}

// ─── Format PSADT for display ─────────────────────────────────────────────────
export function formatPSADT(months) {
  if (months === null) return null
  if (months > 120) return '> 10 years'
  if (months > 24) return `~${(months / 12).toFixed(1)} years`
  return `~${Math.round(months)} months`
}

// ─── Months on AS from enrollment ────────────────────────────────────────────
export function monthsOnAS(enrollmentDate) {
  if (!enrollmentDate) return null
  const ms = Date.now() - new Date(enrollmentDate).getTime()
  return ms / (1000 * 60 * 60 * 24 * 30.44)
}

// ─── Primary progression analysis ────────────────────────────────────────────
// Returns { flags, psadt, psaVelocity, latestGG, upgradeEvent, summaryTier }
export function analyzeProgression(data) {
  const { enrollmentGG, enrollmentDate, enrollmentPSA, visits = [] } = data
  const flags = []

  // Build PSA series from enrollment + visits
  const psaPoints = []
  if (enrollmentDate && parseFloat(enrollmentPSA) > 0) {
    psaPoints.push({ date: enrollmentDate, psa: parseFloat(enrollmentPSA) })
  }
  visits.forEach(v => {
    if (v.date && v.psa > 0) psaPoints.push({ date: v.date, psa: v.psa })
  })

  const psadt = computePSADT(psaPoints)
  const psaVelocity = computePSAVelocity(psaPoints)

  // Compute time span of PSA data in months (needed for reliability gating)
  const psaSorted = [...psaPoints].sort((a, b) => new Date(a.date) - new Date(b.date))
  const psaSpanMonths = psaSorted.length >= 2
    ? (new Date(psaSorted[psaSorted.length - 1].date) - new Date(psaSorted[0].date)) / (1000 * 60 * 60 * 24 * 30.44)
    : 0

  // ── Grade upgrade on biopsy ───────────────────────────────────────────────────
  // AUA/ASTRO 2026 §18: "Detection of significantly higher-volume or higher-grade disease
  // on surveillance biopsy should then prompt discussion of definitive therapy."
  // This is the ONLY criterion that alone warrants a treatment discussion.
  let upgradeEvent = null
  let latestGG = enrollmentGG
  const biopsyVisits = visits.filter(v => v.biopsy && v.biopsy.gg != null).sort((a, b) => new Date(a.date) - new Date(b.date))
  if (biopsyVisits.length > 0) {
    const latest = biopsyVisits[biopsyVisits.length - 1]
    latestGG = latest.biopsy.gg
    if (latest.biopsy.gg > enrollmentGG) {
      upgradeEvent = { date: latest.date, fromGG: enrollmentGG, toGG: latest.biopsy.gg }
      flags.push({
        severity: 'critical',
        code: 'grade_upgrade',
        label: `Grade Group Upgrade: GG${enrollmentGG} → GG${latest.biopsy.gg}`,
        detail: `Biopsy on ${formatDate(latest.date)} showed Grade Group ${latest.biopsy.gg}. Per AUA/ASTRO 2026 §18: "Detection of higher-grade disease on surveillance biopsy should prompt discussion of definitive therapy." Incorporate patient age, comorbidity, life expectancy, and preference into SDM.`,
        source: 'AUA/ASTRO 2026 (Amended) §18; NCCN 2024',
      })
    }
  }

  // ── PSA kinetics ──────────────────────────────────────────────────────────────
  // AUA/ASTRO 2026 §18 exact language:
  //   "An increase in PSA should initially prompt re-testing of PSA as transient
  //    PSA elevations are common and PSA kinetics have variably been associated
  //    with pathology among patients on surveillance."
  //   "Serial PSA increases… should prompt re-evaluation with MRI and possible
  //    prostate biopsy; less frequently, direct conversion to treatment may be
  //    considered."
  // The guideline cites NO specific PSADT or velocity threshold. PRIAS dropped
  // PSADT < 3 yrs as an exit criterion in 2014 (not predictive of RP pathology).
  // We require ≥ 6 months of PSA data before any kinetics flag is actionable.
  if (psadt !== null) {
    if (psaSpanMonths < 6) {
      // Insufficient window — note it but do not raise an actionable flag
      flags.push({
        severity: 'info',
        code: 'psadt_insufficient_data',
        label: `PSA-DT: ${formatPSADT(psadt)} (preliminary — ${Math.round(psaSpanMonths)} months data)`,
        detail: `Apparent PSADT ${formatPSADT(psadt)}, but calculated over only ${Math.round(psaSpanMonths)} months. AUA/ASTRO 2026 §18 notes transient PSA elevations are common — re-test PSA before acting on kinetics. At least 6 months of serial values are needed for a reliable estimate.`,
        source: 'AUA/ASTRO 2026 (Amended) §18',
      })
    } else if (psadt < 36) {
      flags.push({
        severity: 'warning',
        code: 'psadt_short',
        label: `Short PSA Doubling Time: ${formatPSADT(psadt)}`,
        detail: `PSADT ${formatPSADT(psadt)} (< 3 years). AUA/ASTRO 2026 §18: serial PSA increases warrant "re-evaluation with MRI and possible prostate biopsy." PSA kinetics are NOT a standalone trigger for treatment — biopsy is required to assess grade. Note: PRIAS removed PSADT as an exit criterion in 2014 after it was found not predictive of unfavorable RP pathology.`,
        source: 'AUA/ASTRO 2026 (Amended) §18; Drost 2018 (Eur Urol 74:1002)',
      })
    }
  }

  // ── PSA velocity > 0.75 ng/mL/yr ─────────────────────────────────────────────
  // Not cited in AUA/ASTRO 2026. UCSF institutional criterion only.
  // Requires ≥ 6 months window for reliability.
  if (psaVelocity !== null && psaVelocity > 0.75 && psaSpanMonths >= 6) {
    flags.push({
      severity: 'warning',
      code: 'psa_velocity',
      label: `Elevated PSA Velocity: +${psaVelocity.toFixed(2)} ng/mL/yr`,
      detail: `PSA rising at > 0.75 ng/mL/yr. UCSF institutional marker — not cited in AUA/ASTRO 2026. Warrants re-testing PSA, then MRI and biopsy consideration per §18. Not a standalone treatment trigger.`,
      source: 'Carter 2006 (J Urol 176:2416); AUA/ASTRO 2026 §18',
    })
  }

  // ── MRI: PI-RADS 4–5 or new lesion ───────────────────────────────────────────
  // AUA/ASTRO 2026 §19: "If MRI demonstrates findings suspicious for clinically
  // significant prostate cancer (PI-RADS 4 or 5), then timely repeat (confirmatory)
  // targeted biopsy is recommended… MRI cannot be recommended as a stand-alone
  // replacement for periodic repeat biopsy."
  const mriVisits = visits.filter(v => v.mri).sort((a, b) => new Date(a.date) - new Date(b.date))
  if (mriVisits.length >= 2) {
    const first = mriVisits[0].mri
    const latest = mriVisits[mriVisits.length - 1].mri
    if (first.pirads != null && latest.pirads != null && latest.pirads > first.pirads && latest.pirads >= 4) {
      flags.push({
        severity: 'warning',
        code: 'mri_progression',
        label: `MRI Progression: PI-RADS ${first.pirads} → ${latest.pirads}`,
        detail: `PI-RADS worsened to ${latest.pirads} (${formatDate(mriVisits[mriVisits.length - 1].date)}). AUA/ASTRO 2026 §19: "PI-RADS 4 or 5 → timely repeat targeted biopsy recommended." MRI cannot replace biopsy — histological confirmation required before any treatment decision.`,
        source: 'AUA/ASTRO 2026 (Amended) §19',
      })
    }
  }
  // Single MRI with PI-RADS 4–5 also triggers biopsy
  const latestMRI = mriVisits[mriVisits.length - 1]
  if (latestMRI?.mri?.pirads >= 4) {
    const alreadyFlagged = flags.some(f => f.code === 'mri_progression')
    if (!alreadyFlagged) {
      flags.push({
        severity: 'warning',
        code: 'mri_pirads_high',
        label: `PI-RADS ${latestMRI.mri.pirads} on MRI`,
        detail: `PI-RADS ${latestMRI.mri.pirads} on ${formatDate(latestMRI.date)}. AUA/ASTRO 2026 §19: "PI-RADS 4 or 5 → timely repeat (confirmatory) targeted biopsy recommended." Biopsy required to confirm grade — MRI alone does not define progression.`,
        source: 'AUA/ASTRO 2026 (Amended) §19',
      })
    }
  }
  if (latestMRI?.mri?.newLesion) {
    flags.push({
      severity: 'warning',
      code: 'mri_new_lesion',
      label: 'New MRI Lesion Detected',
      detail: `New suspicious lesion on ${formatDate(latestMRI.date)}. AUA/ASTRO 2026 §19: targeted biopsy required. MRI cannot replace biopsy — histological confirmation needed before any treatment decision.`,
      source: 'AUA/ASTRO 2026 (Amended) §19',
    })
  }

  // ── DRE: new abnormality ──────────────────────────────────────────────────────
  // AUA/ASTRO 2026 §18: "new DRE abnormalities… should prompt re-evaluation
  // with MRI and possible prostate biopsy."
  const dreAbnormal = visits.filter(v => v.dre === 'abnormal').sort((a, b) => new Date(a.date) - new Date(b.date))
  if (dreAbnormal.length > 0) {
    flags.push({
      severity: 'warning',
      code: 'dre_abnormal',
      label: 'Abnormal DRE Finding',
      detail: `New palpable abnormality on DRE (${formatDate(dreAbnormal[dreAbnormal.length - 1].date)}). AUA/ASTRO 2026 §18: DRE changes warrant "re-evaluation with MRI and possible prostate biopsy." Biopsy-confirmed upgrade — not DRE alone — triggers treatment discussion.`,
      source: 'AUA/ASTRO 2026 (Amended) §18',
    })
  }

  // ── Summary tier ──────────────────────────────────────────────────────────────
  // progressed = biopsy-confirmed GG upgrade (AUA/ASTRO 2026 §18 — only criterion
  //              for treatment discussion)
  // watch      = PSA kinetics / MRI / DRE changes → biopsy re-evaluation required
  // stable     = no flags
  // info flags do not elevate tier
  let summaryTier = 'stable'
  if (flags.some(f => f.severity === 'critical')) summaryTier = 'progressed'
  else if (flags.some(f => f.severity === 'warning')) summaryTier = 'watch'

  return { flags, psadt, psaVelocity, latestGG, upgradeEvent, summaryTier, psaPoints, psaSpanMonths }
}

// ─── Cohort risk contextualization (N=1,213 Mount Sinai) ─────────────────────
export function getCohortContext(data, analysisResult) {
  const { enrollmentGG, race } = data
  const { latestGG } = analysisResult
  const months = monthsOnAS(data.enrollmentDate)
  const lines = []

  // Overall upgrade rate
  lines.push(`In the Mount Sinai Tewari AS Program (N=1,213), overall upgrade rate is 25.1% at any follow-up biopsy.`)

  // By current GG
  const ggRates = { 1: 0.267, 2: 0.080 }
  if (ggRates[enrollmentGG] !== undefined) {
    lines.push(`For GG${enrollmentGG} at enrollment: ${(ggRates[enrollmentGG] * 100).toFixed(0)}% upgrade rate in our cohort.`)
  }

  // By race
  const raceRates = { african_american: { label: 'African American', rate: 0.341, n: 129 }, caucasian: { label: 'Caucasian', rate: 0.292, n: 708 } }
  if (raceRates[race]) {
    const r = raceRates[race]
    lines.push(`${r.label} patients in our cohort (N=${r.n}): ${(r.rate * 100).toFixed(0)}% upgrade rate.`)
  }

  // Currently stable
  lines.push(`59.7% of our 1,213 patients remain on active surveillance today. Of those who left, 47.4% did so by personal preference rather than clinical progression.`)

  return lines
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch (_) { return iso }
}

export function generateVisitId() {
  return `visit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function loadProgressionData() {
  try {
    const raw = localStorage.getItem(PROGRESSION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (_) { return null }
}

export function saveProgressionData(data) {
  try {
    localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(data))
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAJECTORY-AWARE SIGNALS (additive — nothing above this line is affected)
//
// These consume a longitudinal patientRecord (src/patientRecord.js) rather than
// the legacy `visits` array, and read derived kinetics from derivedMetrics.js.
//
// Design constraint, deliberately: these functions DO NOT produce a risk tier
// and DO NOT reclassify anyone. `analyzeProgression`'s summaryTier remains the
// single classification in this module. Everything below returns observations
// for a clinician to weigh, each carrying the data that produced it.
// ─────────────────────────────────────────────────────────────────────────────

import {
  EVENT_TYPES as REC_EVENT_TYPES,
  sortedEvents as recSortedEvents,
  psaSeries as recPSASeries,
} from './patientRecord.js'
import {
  computePSAVelocity as deriveVelocity,
  computePSADoublingTime as deriveDoublingTime,
  computeAdherence as deriveAdherence,
  formatDoublingTime as fmtDoublingTime,
} from './derivedMetrics.js'

/**
 * Grade Group trajectory across every recorded biopsy.
 * Reports the sequence and whether the most recent biopsy is higher than the
 * lowest previously observed value. Returns { sequence, latest, nadir, upgraded }.
 */
export function biopsyTrajectory(record) {
  const biopsies = recSortedEvents(record, REC_EVENT_TYPES.BIOPSY)
    .filter(ev => ev.data && ev.data.ggg != null)
  if (!biopsies.length) return { sequence: [], latest: null, nadir: null, upgraded: false }

  const sequence = biopsies.map(ev => ({
    date: ev.date,
    ggg: ev.data.ggg,
    positiveCores: ev.data.positiveCores,
    totalCores: ev.data.totalCores,
    maxCorePercent: ev.data.maxCorePercent,
  }))
  const values = sequence.map(s => s.ggg)
  const latest = sequence[sequence.length - 1]
  const nadir = Math.min(...values)
  return { sequence, latest, nadir, upgraded: latest.ggg > nadir }
}

/**
 * MRI trajectory: PI-RADS sequence and whether the latest reading is higher
 * than any prior one.
 */
export function mriTrajectory(record) {
  const mris = recSortedEvents(record, REC_EVENT_TYPES.MRI)
  if (!mris.length) return { sequence: [], latest: null, rising: false }
  const sequence = mris.map(ev => ({
    date: ev.date,
    pirads: ev.data?.pirads ?? null,
    newLesion: !!ev.data?.newLesion,
  }))
  const scored = sequence.filter(s => s.pirads != null)
  const latest = scored[scored.length - 1] || null
  const rising = latest != null && scored.slice(0, -1).some(s => latest.pirads > s.pirads)
  return { sequence, latest, rising }
}

/**
 * Trajectory observations from a longitudinal record.
 *
 * Returns { observations, kinetics, adherence, trajectoryComplete } where each
 * observation is { code, tone, label, detail, basis }. `tone` is 'neutral' |
 * 'attention' — intentionally NOT the severity vocabulary used by
 * analyzeProgression, so these can never be mistaken for a tier change.
 *
 * `trajectoryComplete` is false when the record is too sparse to support any of
 * this, which is itself the honest answer.
 */
export function analyzeTrajectory(record, options = {}) {
  const observations = []
  const series = recPSASeries(record)
  const velocity = deriveVelocity(series, options)
  const doublingTime = deriveDoublingTime(series, options)
  const adherence = deriveAdherence(record, options)

  // ── PSA kinetics, derived rather than typed in ──────────────────────────────
  if (velocity.value === null) {
    observations.push({
      code: 'velocity_not_computable', tone: 'neutral',
      label: 'PSA velocity not computable',
      detail: velocity.detail,
      basis: `${series.length} PSA value(s) on record.`,
    })
  } else if (velocity.value > 0.75) {
    observations.push({
      code: 'velocity_elevated', tone: 'attention',
      label: `PSA velocity +${velocity.value.toFixed(2)} ng/mL/yr`,
      detail: 'Above the 0.75 ng/mL/yr UCSF institutional marker. Not cited in AUA/ASTRO 2026 and not a standalone trigger — re-test PSA, then weigh MRI and biopsy per §18.',
      basis: `Least-squares fit over ${velocity.n} values spanning ${Math.round(velocity.spanMonths)} months (R² ${velocity.r2 != null ? velocity.r2.toFixed(2) : 'n/a'}).`,
    })
  } else {
    observations.push({
      code: 'velocity_stable', tone: 'neutral',
      label: `PSA velocity ${velocity.value >= 0 ? '+' : ''}${velocity.value.toFixed(2)} ng/mL/yr`,
      detail: 'At or below the 0.75 ng/mL/yr institutional marker.',
      basis: `Least-squares fit over ${velocity.n} values spanning ${Math.round(velocity.spanMonths)} months.`,
    })
  }

  if (doublingTime.value === null) {
    observations.push({
      code: 'psadt_not_computable', tone: 'neutral',
      label: 'PSA doubling time not computable',
      detail: doublingTime.detail,
      basis: doublingTime.reason,
    })
  } else if (doublingTime.value < 36) {
    observations.push({
      code: 'psadt_short_trajectory', tone: 'attention',
      label: `PSA doubling time ${fmtDoublingTime(doublingTime)}`,
      detail: 'Under 3 years. AUA/ASTRO 2026 §18 treats serial PSA rises as a prompt for MRI and possible biopsy, not for treatment. PRIAS removed PSADT as an exit criterion in 2014.',
      basis: `Log-linear fit over ${doublingTime.n} values spanning ${Math.round(doublingTime.spanMonths)} months.`,
    })
  } else {
    observations.push({
      code: 'psadt_long', tone: 'neutral',
      label: `PSA doubling time ${fmtDoublingTime(doublingTime)}`,
      detail: 'At or above 3 years.',
      basis: `Log-linear fit over ${doublingTime.n} values spanning ${Math.round(doublingTime.spanMonths)} months.`,
    })
  }

  // ── Biopsy trajectory ──────────────────────────────────────────────────────
  const bx = biopsyTrajectory(record)
  if (bx.upgraded) {
    observations.push({
      code: 'biopsy_trajectory_upgrade', tone: 'attention',
      label: `Grade Group trajectory GG${bx.nadir} → GG${bx.latest.ggg}`,
      detail: 'Biopsy-confirmed grade increase relative to the lowest prior surveillance biopsy. Per AUA/ASTRO 2026 §18 this warrants a discussion of definitive therapy in the context of age, comorbidity, life expectancy, and preference.',
      basis: bx.sequence.map(s => `${s.date}: GG${s.ggg}`).join(' · '),
    })
  } else if (bx.sequence.length >= 2) {
    observations.push({
      code: 'biopsy_trajectory_stable', tone: 'neutral',
      label: `Grade stable across ${bx.sequence.length} biopsies`,
      detail: 'No grade increase relative to the lowest prior surveillance biopsy.',
      basis: bx.sequence.map(s => `${s.date}: GG${s.ggg}`).join(' · '),
    })
  }

  // ── MRI trajectory ─────────────────────────────────────────────────────────
  const mri = mriTrajectory(record)
  if (mri.rising) {
    observations.push({
      code: 'mri_trajectory_rising', tone: 'attention',
      label: `PI-RADS rising to ${mri.latest.pirads}`,
      detail: 'PI-RADS higher than a prior study. AUA/ASTRO 2026 §19: PI-RADS 4–5 warrants timely targeted biopsy; MRI cannot replace biopsy.',
      basis: mri.sequence.filter(s => s.pirads != null).map(s => `${s.date}: PI-RADS ${s.pirads}`).join(' · '),
    })
  }

  // ── Monitoring gaps ────────────────────────────────────────────────────────
  if (adherence.hasGaps) {
    observations.push({
      code: 'surveillance_gap', tone: 'attention',
      label: adherence.summary,
      detail: 'Overdue surveillance means the trajectory above is estimated from stale data. Close the gap before weighing the kinetics.',
      basis: adherence.overdue.map(i => `${i.label}: ${i.daysOverdue} days past due`).join(' · '),
    })
  }

  const trajectoryComplete = velocity.value !== null || bx.sequence.length >= 2 || mri.sequence.length >= 2

  return {
    observations,
    kinetics: { velocity, doublingTime },
    biopsy: bx,
    mri,
    adherence,
    trajectoryComplete,
    disclaimer: 'Trajectory signals are supplementary context for a clinician. They do not assign or change a risk tier.',
  }
}

/**
 * Bridge for callers that hand-type PSA kinetics into the risk engine: returns
 * the derived values in the units those inputs expect
 * (psaVelocity ng/mL/yr, psaDoublingTime years), or null when not derivable.
 * Callers decide whether to use them; nothing is written back automatically.
 */
export function deriveEngineInputsFromRecord(record, options = {}) {
  const series = recPSASeries(record)
  const v = deriveVelocity(series, options)
  const dt = deriveDoublingTime(series, options)
  return {
    psaVelocity: v.value,
    psaVelocityReason: v.value === null ? v.reason : null,
    psaDoublingTime: dt.value === null ? null : dt.years,
    psaDoublingTimeReason: dt.value === null ? dt.reason : null,
  }
}
