/**
 * Golden-case regression suite for progressionEngine.js
 *
 * Asserts ACTUAL current behavior. `// SUSPECT:` marks things that looked wrong
 * while reading; they are asserted as-is, not fixed.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  PROGRESSION_STORAGE_KEY,
  ROSTER_STORAGE_KEY,
  generatePatientId,
  generateVisitId,
  loadRoster,
  saveRoster,
  getActivePatient,
  upsertPatient,
  deletePatient,
  newPatientRecord,
  parseImportJSON,
  defaultProgressionData,
  computePSADT,
  computePSAVelocity,
  formatPSADT,
  monthsOnAS,
  analyzeProgression,
  getCohortContext,
  formatDate,
  loadProgressionData,
  saveProgressionData,
} from '../progressionEngine.js'

// ─── localStorage stub (node environment) ───────────────────────────────────
function installLocalStorage() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
  }
  return store
}

const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString()

describe('id generators', () => {
  it('produce distinctly-prefixed unique ids', () => {
    expect(generatePatientId()).toMatch(/^pt_\d+_[a-z0-9]+$/)
    expect(generateVisitId()).toMatch(/^visit_\d+_[a-z0-9]+$/)
    expect(generatePatientId()).not.toBe(generatePatientId())
  })
})

describe('defaultProgressionData', () => {
  it('returns the documented empty shape', () => {
    expect(defaultProgressionData()).toEqual({
      enrollmentDate: '', enrollmentGG: 1, enrollmentPSA: '',
      prostateVolume: '', age: '', race: 'unknown', visits: [],
    })
  })

  it('newPatientRecord extends it with identity fields', () => {
    const p = newPatientRecord('Mr X')
    expect(p.label).toBe('Mr X')
    expect(p.enrollmentGG).toBe(1)
    expect(p.id).toMatch(/^pt_/)
    expect(p.createdAt).toBeTruthy()
    expect(newPatientRecord().label).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// PSA kinetics
// ═══════════════════════════════════════════════════════════════════════════
describe('computePSADT (log-linear, returns MONTHS)', () => {
  it('returns null for fewer than two usable points', () => {
    expect(computePSADT(null)).toBeNull()
    expect(computePSADT([])).toBeNull()
    expect(computePSADT([{ date: D(2020, 1, 1), psa: 4 }])).toBeNull()
    // non-positive PSA values are filtered out before the count check
    expect(computePSADT([{ date: D(2020, 1, 1), psa: 4 }, { date: D(2021, 1, 1), psa: 0 }])).toBeNull()
    expect(computePSADT([{ date: D(2020, 1, 1), psa: -1 }, { date: D(2021, 1, 1), psa: -2 }])).toBeNull()
  })

  it('returns null for flat or falling PSA (slope <= 0)', () => {
    expect(computePSADT([{ date: D(2020, 1, 1), psa: 5 }, { date: D(2022, 1, 1), psa: 5 }])).toBeNull()
    expect(computePSADT([{ date: D(2020, 1, 1), psa: 6 }, { date: D(2022, 1, 1), psa: 4 }])).toBeNull()
  })

  it('returns null when all points share one date (zero variance in x)', () => {
    expect(computePSADT([{ date: D(2020, 1, 1), psa: 4 }, { date: D(2020, 1, 1), psa: 8 }])).toBeNull()
  })

  it('a true doubling over 12 months yields ~12 months', () => {
    const dt = computePSADT([{ date: D(2020, 1, 1), psa: 4 }, { date: D(2021, 1, 1), psa: 8 }])
    expect(dt).toBeGreaterThan(11.9)
    expect(dt).toBeLessThan(12.1)
  })

  it('a doubling over 48 months yields ~48 months', () => {
    const dt = computePSADT([{ date: D(2020, 1, 1), psa: 4 }, { date: D(2024, 1, 1), psa: 8 }])
    expect(dt).toBeGreaterThan(47.5)
    expect(dt).toBeLessThan(48.5)
  })

  it('is order-independent (points are sorted internally)', () => {
    const a = computePSADT([{ date: D(2021, 1, 1), psa: 8 }, { date: D(2020, 1, 1), psa: 4 }])
    const b = computePSADT([{ date: D(2020, 1, 1), psa: 4 }, { date: D(2021, 1, 1), psa: 8 }])
    expect(a).toBeCloseTo(b, 10)
  })

  it('does not mutate the caller array', () => {
    const pts = [{ date: D(2021, 1, 1), psa: 8 }, { date: D(2020, 1, 1), psa: 4 }]
    computePSADT(pts)
    expect(pts[0].psa).toBe(8)
  })
})

describe('computePSAVelocity (ng/mL/yr)', () => {
  it('returns null for fewer than two usable points', () => {
    expect(computePSAVelocity([])).toBeNull()
    expect(computePSAVelocity([{ date: D(2020, 1, 1), psa: 4 }])).toBeNull()
    expect(computePSAVelocity(undefined)).toBeNull()
  })

  it('returns null when the window is under ~1 month (0.08 yr)', () => {
    expect(computePSAVelocity([{ date: D(2020, 1, 1), psa: 4 }, { date: D(2020, 1, 20), psa: 9 }])).toBeNull()
    expect(computePSAVelocity([{ date: D(2020, 1, 1), psa: 4 }, { date: D(2020, 3, 1), psa: 5 }])).not.toBeNull()
  })

  it('computes +1.0 ng/mL/yr over a 1-year rise of 1.0', () => {
    const v = computePSAVelocity([{ date: D(2020, 1, 1), psa: 4 }, { date: D(2021, 1, 1), psa: 5 }])
    expect(v).toBeCloseTo(1.0, 2)
  })

  it('can be negative for a falling PSA', () => {
    expect(computePSAVelocity([{ date: D(2020, 1, 1), psa: 6 }, { date: D(2021, 1, 1), psa: 4 }])).toBeLessThan(0)
  })

  // SUSPECT: src/progressionEngine.js:222-226 — velocity uses ONLY the first and
  // last points, ignoring everything in between, while computePSADT does a proper
  // regression over all points. A patient whose PSA spiked to 30 mid-series and
  // returned to baseline shows velocity 0. Two functions on the same data use
  // two different estimators.
  it('SUSPECT: velocity ignores all intermediate points (endpoint-only slope)', () => {
    const spiky = [
      { date: D(2020, 1, 1), psa: 4 },
      { date: D(2020, 7, 1), psa: 30 },
      { date: D(2021, 1, 1), psa: 4 },
    ]
    expect(computePSAVelocity(spiky)).toBeCloseTo(0, 6)
  })
})

describe('formatPSADT', () => {
  it.each([
    [null, null],
    [6, '~6 months'],
    [24, '~24 months'],
    [24.5, '~2.0 years'],
    [36, '~3.0 years'],
    [120, '~10.0 years'],
    [121, '> 10 years'],
  ])('formatPSADT(%s) → %s', (months, out) => {
    expect(formatPSADT(months)).toBe(out)
  })

  // SUSPECT: src/progressionEngine.js:231 — the guard is `months === null`, so
  // formatPSADT(undefined) falls through to `~NaN months`. Callers that pass an
  // absent value rather than an explicit null will render "~NaN months".
  it('SUSPECT: formatPSADT(undefined) renders "~NaN months"', () => {
    expect(formatPSADT(undefined)).toBe('~NaN months')
  })
})

describe('monthsOnAS', () => {
  it('returns null with no enrollment date', () => {
    expect(monthsOnAS('')).toBeNull()
    expect(monthsOnAS(null)).toBeNull()
    expect(monthsOnAS(undefined)).toBeNull()
  })

  it('measures elapsed months from now', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(D(2021, 1, 1)))
    expect(monthsOnAS(D(2020, 1, 1))).toBeCloseTo(12, 1)
    vi.useRealTimers()
  })
})

describe('formatDate', () => {
  it('returns "" for falsy input and a readable string otherwise', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate(null)).toBe('')
    expect(formatDate('2021-06-15T00:00:00.000Z')).toMatch(/2021/)
  })

  // SUSPECT: src/progressionEngine.js:435-440 — the try/catch never fires
  // because `new Date('garbage')` does not throw, it yields an Invalid Date.
  // toLocaleDateString then returns "Invalid Date", which is rendered directly
  // into clinical flag detail strings.
  it('SUSPECT: an unparseable date renders as "Invalid Date", not the raw input', () => {
    expect(formatDate('not-a-date')).toBe('Invalid Date')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// analyzeProgression
// ═══════════════════════════════════════════════════════════════════════════
const patient = (o = {}) => ({ ...defaultProgressionData(), enrollmentDate: D(2020, 1, 1), enrollmentPSA: '4', ...o })

describe('analyzeProgression: stable baseline', () => {
  it('no visits → stable, no flags', () => {
    const r = analyzeProgression(patient())
    expect(r.summaryTier).toBe('stable')
    expect(r.flags).toEqual([])
    expect(r.psadt).toBeNull()
    expect(r.psaVelocity).toBeNull()
    expect(r.latestGG).toBe(1)
    expect(r.upgradeEvent).toBeNull()
    expect(r.psaSpanMonths).toBe(0)
  })

  it('tolerates a completely empty object', () => {
    const r = analyzeProgression({})
    expect(r.summaryTier).toBe('stable')
    expect(r.latestGG).toBeUndefined()
  })
})

describe('analyzeProgression: grade upgrade (critical)', () => {
  it('GG1 → GG2 on the latest biopsy is critical and sets summaryTier=progressed', () => {
    const r = analyzeProgression(patient({
      visits: [{ id: 'v1', date: D(2022, 1, 1), biopsy: { gg: 2, totalCores: 12, positiveCores: 3 } }],
    }))
    const f = r.flags.find(x => x.code === 'grade_upgrade')
    expect(f.severity).toBe('critical')
    expect(f.label).toBe('Grade Group Upgrade: GG1 → GG2')
    expect(r.upgradeEvent).toEqual({ date: D(2022, 1, 1), fromGG: 1, toGG: 2 })
    expect(r.latestGG).toBe(2)
    expect(r.summaryTier).toBe('progressed')
  })

  it('same grade on repeat biopsy is not an upgrade', () => {
    const r = analyzeProgression(patient({
      visits: [{ id: 'v1', date: D(2022, 1, 1), biopsy: { gg: 1 } }],
    }))
    expect(r.upgradeEvent).toBeNull()
    expect(r.latestGG).toBe(1)
    expect(r.summaryTier).toBe('stable')
  })

  // SUSPECT: src/progressionEngine.js:274-288 — only the LATEST biopsy is
  // compared to enrollment GG. A patient who upgraded to GG3 and whose next
  // biopsy sampled GG1 shows NO upgrade flag and latestGG=1: the historical
  // upgrade event silently disappears.
  it('SUSPECT: a later lower-grade biopsy erases a documented earlier upgrade', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2021, 1, 1), biopsy: { gg: 3 } },
        { id: 'v2', date: D(2022, 1, 1), biopsy: { gg: 1 } },
      ],
    }))
    expect(r.upgradeEvent).toBeNull()
    expect(r.latestGG).toBe(1)
    expect(r.summaryTier).toBe('stable')
  })

  it('uses the chronologically latest biopsy regardless of array order', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v2', date: D(2022, 1, 1), biopsy: { gg: 3 } },
        { id: 'v1', date: D(2021, 1, 1), biopsy: { gg: 1 } },
      ],
    }))
    expect(r.latestGG).toBe(3)
    expect(r.upgradeEvent.toGG).toBe(3)
  })

  it('ignores visits with a biopsy whose gg is null', () => {
    const r = analyzeProgression(patient({
      visits: [{ id: 'v1', date: D(2022, 1, 1), biopsy: { gg: null } }],
    }))
    expect(r.latestGG).toBe(1)
  })
})

describe('analyzeProgression: PSA kinetics gating', () => {
  it('PSADT under 3 years with < 6 months of data is info-only and does NOT elevate the tier', () => {
    const r = analyzeProgression(patient({
      enrollmentDate: D(2020, 1, 1), enrollmentPSA: '4',
      visits: [{ id: 'v1', date: D(2020, 4, 1), psa: 6 }],
    }))
    const f = r.flags.find(x => x.code === 'psadt_insufficient_data')
    expect(f.severity).toBe('info')
    expect(r.summaryTier).toBe('stable')
    expect(r.psaSpanMonths).toBeLessThan(6)
  })

  it('PSADT < 36 months with >= 6 months of data is a warning → watch', () => {
    const r = analyzeProgression(patient({
      enrollmentDate: D(2020, 1, 1), enrollmentPSA: '4',
      visits: [{ id: 'v1', date: D(2021, 1, 1), psa: 8 }],
    }))
    const f = r.flags.find(x => x.code === 'psadt_short')
    expect(f.severity).toBe('warning')
    expect(r.psadt).toBeLessThan(36)
    expect(r.summaryTier).toBe('watch')
  })

  it('PSADT >= 36 months raises no PSADT flag (boundary)', () => {
    // doubling over 4 years → PSADT ~48 months
    const r = analyzeProgression(patient({
      enrollmentDate: D(2020, 1, 1), enrollmentPSA: '4',
      visits: [{ id: 'v1', date: D(2024, 1, 1), psa: 8 }],
    }))
    expect(r.psadt).toBeGreaterThan(36)
    expect(r.flags.some(f => f.code.startsWith('psadt'))).toBe(false)
  })

  it('PSA velocity > 0.75 with >= 6 months of data warns; <= 0.75 does not', () => {
    const over = analyzeProgression(patient({
      enrollmentDate: D(2020, 1, 1), enrollmentPSA: '4',
      visits: [{ id: 'v1', date: D(2021, 1, 1), psa: 4.8 }],
    }))
    expect(over.psaVelocity).toBeGreaterThan(0.75)
    expect(over.flags.some(f => f.code === 'psa_velocity')).toBe(true)

    const under = analyzeProgression(patient({
      enrollmentDate: D(2020, 1, 1), enrollmentPSA: '4',
      visits: [{ id: 'v1', date: D(2021, 1, 1), psa: 4.5 }],
    }))
    expect(under.flags.some(f => f.code === 'psa_velocity')).toBe(false)
  })

  it('velocity flag is suppressed under a 6-month window', () => {
    const r = analyzeProgression(patient({
      enrollmentDate: D(2020, 1, 1), enrollmentPSA: '4',
      visits: [{ id: 'v1', date: D(2020, 4, 1), psa: 10 }],
    }))
    expect(r.psaVelocity).toBeGreaterThan(0.75)
    expect(r.flags.some(f => f.code === 'psa_velocity')).toBe(false)
  })

  it('enrollment PSA is only seeded when both date and a positive PSA are present', () => {
    const noPsa = analyzeProgression(patient({ enrollmentPSA: '', visits: [{ id: 'v1', date: D(2021, 1, 1), psa: 8 }] }))
    expect(noPsa.psaPoints).toHaveLength(1)
    const withPsa = analyzeProgression(patient({ visits: [{ id: 'v1', date: D(2021, 1, 1), psa: 8 }] }))
    expect(withPsa.psaPoints).toHaveLength(2)
  })
})

describe('analyzeProgression: MRI', () => {
  it('PI-RADS worsening to >= 4 across two MRIs flags mri_progression', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2020, 6, 1), mri: { pirads: 2, newLesion: false } },
        { id: 'v2', date: D(2022, 6, 1), mri: { pirads: 4, newLesion: false } },
      ],
    }))
    expect(r.flags.some(f => f.code === 'mri_progression')).toBe(true)
    expect(r.flags.some(f => f.code === 'mri_pirads_high')).toBe(false) // deduped
    expect(r.summaryTier).toBe('watch')
  })

  it('a single PI-RADS 4 MRI flags mri_pirads_high', () => {
    const r = analyzeProgression(patient({
      visits: [{ id: 'v1', date: D(2021, 1, 1), mri: { pirads: 4, newLesion: false } }],
    }))
    expect(r.flags.some(f => f.code === 'mri_pirads_high')).toBe(true)
  })

  it.each([[3, false], [4, true], [5, true]])('PI-RADS %i on latest MRI → flagged: %s', (pirads, flagged) => {
    const r = analyzeProgression(patient({
      visits: [{ id: 'v1', date: D(2021, 1, 1), mri: { pirads, newLesion: false } }],
    }))
    expect(r.flags.some(f => f.code === 'mri_pirads_high')).toBe(flagged)
  })

  it('improving PI-RADS raises no progression flag', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2020, 6, 1), mri: { pirads: 4, newLesion: false } },
        { id: 'v2', date: D(2022, 6, 1), mri: { pirads: 2, newLesion: false } },
      ],
    }))
    expect(r.flags.some(f => f.code.startsWith('mri_'))).toBe(false)
  })

  it('a new lesion on the latest MRI is always flagged', () => {
    const r = analyzeProgression(patient({
      visits: [{ id: 'v1', date: D(2021, 1, 1), mri: { pirads: 2, newLesion: true } }],
    }))
    expect(r.flags.some(f => f.code === 'mri_new_lesion')).toBe(true)
  })

  // SUSPECT: src/progressionEngine.js:355-376 — only the LATEST MRI is checked
  // for a high PI-RADS or a new lesion. A PI-RADS 5 or a new lesion recorded at
  // an earlier visit is silently dropped once a later, quieter MRI is added.
  it('SUSPECT: an earlier PI-RADS 5 / new lesion is dropped by a later benign MRI', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2020, 6, 1), mri: { pirads: 5, newLesion: true } },
        { id: 'v2', date: D(2022, 6, 1), mri: { pirads: 2, newLesion: false } },
      ],
    }))
    expect(r.flags.some(f => f.code.startsWith('mri_'))).toBe(false)
    expect(r.summaryTier).toBe('stable')
  })
})

describe('analyzeProgression: DRE', () => {
  it('any abnormal DRE, at any visit, warns', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2020, 6, 1), dre: 'abnormal' },
        { id: 'v2', date: D(2022, 6, 1), dre: 'normal' },
      ],
    }))
    expect(r.flags.some(f => f.code === 'dre_abnormal')).toBe(true)
    expect(r.summaryTier).toBe('watch')
  })

  it.each(['normal', 'not_done', null, undefined])('dre %s raises no flag', (dre) => {
    const r = analyzeProgression(patient({ visits: [{ id: 'v1', date: D(2021, 1, 1), dre }] }))
    expect(r.flags.some(f => f.code === 'dre_abnormal')).toBe(false)
  })
})

describe('analyzeProgression: summaryTier precedence', () => {
  it('critical beats warning', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2022, 1, 1), biopsy: { gg: 2 }, mri: { pirads: 5, newLesion: true }, dre: 'abnormal' },
      ],
    }))
    expect(r.summaryTier).toBe('progressed')
    expect(r.flags.length).toBeGreaterThan(2)
  })

  it('info alone never elevates the tier', () => {
    const r = analyzeProgression(patient({
      enrollmentDate: D(2020, 1, 1), enrollmentPSA: '4',
      visits: [{ id: 'v1', date: D(2020, 3, 1), psa: 9 }],
    }))
    expect(r.flags.every(f => f.severity === 'info')).toBe(true)
    expect(r.summaryTier).toBe('stable')
  })

  it('every flag carries a severity, code, label, detail and source', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2022, 1, 1), psa: 12, biopsy: { gg: 3 }, mri: { pirads: 5, newLesion: true }, dre: 'abnormal' },
      ],
    }))
    for (const f of r.flags) {
      expect(f).toMatchObject({
        severity: expect.stringMatching(/^(info|warning|critical)$/),
        code: expect.any(String),
        label: expect.any(String),
        detail: expect.any(String),
        source: expect.any(String),
      })
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// getCohortContext
// ═══════════════════════════════════════════════════════════════════════════
describe('getCohortContext', () => {
  it('always states the overall rate and the on-AS proportion', () => {
    const lines = getCohortContext(patient(), analyzeProgression(patient()))
    expect(lines[0]).toMatch(/N=1,213.*25\.1%/)
    expect(lines.at(-1)).toMatch(/59\.7%/)
  })

  it.each([[1, '27%'], [2, '8%']])('adds a GG%i line', (enrollmentGG, pct) => {
    const d = patient({ enrollmentGG })
    const lines = getCohortContext(d, analyzeProgression(d))
    expect(lines.some(l => l.includes(`GG${enrollmentGG} at enrollment`) && l.includes(pct))).toBe(true)
  })

  it('omits the GG line for grades with no cohort rate', () => {
    const d = patient({ enrollmentGG: 4 })
    expect(getCohortContext(d, analyzeProgression(d)).some(l => l.includes('at enrollment'))).toBe(false)
  })

  it.each([
    ['african_american', /African American.*N=129.*34%/],
    ['caucasian', /Caucasian.*N=708.*29%/],
  ])('adds a race line for %s', (race, re) => {
    const d = patient({ race })
    expect(getCohortContext(d, analyzeProgression(d)).some(l => re.test(l))).toBe(true)
  })

  it.each(['other', 'unknown', undefined])('omits the race line for %s', (race) => {
    const d = patient({ race })
    expect(getCohortContext(d, analyzeProgression(d)).some(l => /upgrade rate\.$/.test(l) && /N=/.test(l))).toBe(false)
  })

  // SUSPECT: src/progressionEngine.js:416 and 422 — the GG and race rates are
  // hard-coded literals here (0.267 / 0.080 / 0.341 / 0.292) and duplicated from
  // asEngine.js COHORT_CALIBRATION rather than imported. The two files can drift
  // apart silently; the "other" race category (14.4% in asEngine) has no entry
  // at all here.
  it('SUSPECT: cohort rates are duplicated literals, and "other" race is missing', () => {
    const d = patient({ race: 'other' })
    const lines = getCohortContext(d, analyzeProgression(d))
    expect(lines).toHaveLength(3)
    expect(lines.some(l => /14\.4%|Other/.test(l))).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Roster persistence
// ═══════════════════════════════════════════════════════════════════════════
describe('roster helpers (pure)', () => {
  it('getActivePatient resolves activeId, falls back to first, or null', () => {
    expect(getActivePatient(null)).toBeNull()
    expect(getActivePatient({ patients: [] })).toBeNull()
    const roster = { patients: [{ id: 'a' }, { id: 'b' }], activeId: 'b' }
    expect(getActivePatient(roster).id).toBe('b')
    expect(getActivePatient({ ...roster, activeId: 'zzz' }).id).toBe('a')
    expect(getActivePatient({ ...roster, activeId: null }).id).toBe('a')
  })

  it('upsertPatient appends a new patient and makes it active', () => {
    const r = upsertPatient({ patients: [], activeId: null }, { id: 'a', label: 'A' })
    expect(r.patients).toHaveLength(1)
    expect(r.activeId).toBe('a')
    expect(r.patients[0].createdAt).toBeTruthy()
    expect(r.patients[0].updatedAt).toBeTruthy()
  })

  it('upsertPatient replaces in place without reordering', () => {
    let r = { patients: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], activeId: 'a' }
    r = upsertPatient(r, { id: 'a', label: 'A2' })
    expect(r.patients.map(p => p.id)).toEqual(['a', 'b'])
    expect(r.patients[0].label).toBe('A2')
    expect(r.patients[0].createdAt).toBeUndefined() // update path does not add createdAt
  })

  it('deletePatient removes and re-points activeId', () => {
    const r = deletePatient({ patients: [{ id: 'a' }, { id: 'b' }], activeId: 'a' }, 'a')
    expect(r.patients.map(p => p.id)).toEqual(['b'])
    expect(r.activeId).toBe('b')
  })

  it('deletePatient leaves activeId alone when a different patient is removed', () => {
    const r = deletePatient({ patients: [{ id: 'a' }, { id: 'b' }], activeId: 'a' }, 'b')
    expect(r.activeId).toBe('a')
  })

  it('deleting the last patient nulls activeId', () => {
    expect(deletePatient({ patients: [{ id: 'a' }], activeId: 'a' }, 'a').activeId).toBeNull()
  })
})

describe('roster persistence (localStorage)', () => {
  beforeEach(() => { installLocalStorage() })
  afterEach(() => { delete globalThis.localStorage })

  it('loadRoster returns an empty roster when storage is empty', () => {
    expect(loadRoster()).toEqual({ patients: [], activeId: null })
  })

  it('saveRoster / loadRoster round-trips and stamps updatedAt', () => {
    saveRoster({ patients: [{ id: 'a', label: 'A' }], activeId: 'a' })
    const r = loadRoster()
    expect(r.patients[0].label).toBe('A')
    expect(r.updatedAt).toBeTruthy()
  })

  it('migrates a legacy single-patient record into a roster and clears the old key', () => {
    saveProgressionData({ ...defaultProgressionData(), enrollmentGG: 2 })
    const r = loadRoster()
    expect(r.patients).toHaveLength(1)
    expect(r.patients[0].label).toBe('Patient 1')
    expect(r.patients[0].enrollmentGG).toBe(2)
    expect(r.activeId).toBe(r.patients[0].id)
    expect(localStorage.getItem(PROGRESSION_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(ROSTER_STORAGE_KEY)).toBeTruthy()
  })

  it('loadProgressionData returns null when absent or corrupt', () => {
    expect(loadProgressionData()).toBeNull()
    localStorage.setItem(PROGRESSION_STORAGE_KEY, '{not json')
    expect(loadProgressionData()).toBeNull()
  })

  // SUSPECT: src/progressionEngine.js:24-28 — a corrupt roster blob makes
  // JSON.parse throw; the catch swallows it and execution falls through to the
  // legacy-migration path, which returns an EMPTY roster. Corrupt storage
  // therefore presents as "no patients" rather than an error, and the next
  // saveRoster silently overwrites the (possibly recoverable) data.
  it('SUSPECT: a corrupt roster blob silently reads as an empty roster', () => {
    localStorage.setItem(ROSTER_STORAGE_KEY, '{not json')
    expect(loadRoster()).toEqual({ patients: [], activeId: null })
  })

  it('saveRoster swallows quota/storage errors', () => {
    globalThis.localStorage.setItem = () => { throw new Error('QuotaExceeded') }
    expect(() => saveRoster({ patients: [], activeId: null })).not.toThrow()
    expect(() => saveProgressionData({})).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Import parsing
// ═══════════════════════════════════════════════════════════════════════════
describe('parseImportJSON', () => {
  it('recognizes a roster export', () => {
    expect(parseImportJSON('{"patients":[]}')).toMatchObject({ ok: true, type: 'roster' })
  })

  it('recognizes a single patient by id or enrollmentDate', () => {
    expect(parseImportJSON('{"id":"pt_1"}')).toMatchObject({ ok: true, type: 'patient' })
    expect(parseImportJSON('{"enrollmentDate":""}')).toMatchObject({ ok: true, type: 'patient' })
  })

  it('rejects invalid JSON and unrecognized structures', () => {
    expect(parseImportJSON('{not json')).toEqual({ ok: false, error: 'Invalid JSON file.' })
    expect(parseImportJSON('{"foo":1}')).toEqual({ ok: false, error: 'Unrecognized JSON structure.' })
  })

  // SUSPECT: src/progressionEngine.js:150-159 — `data.patients` is only checked
  // with Array.isArray AFTER truthiness, so `{"patients": {}}` skips the roster
  // branch and then fails the patient branch; but a top-level JSON scalar such
  // as `null` or `5` throws on property access inside the try and is reported as
  // "Invalid JSON file." even though the JSON was perfectly valid. Also, no
  // per-field validation is done: `{"id": 5, "visits": "nope"}` is accepted as a
  // valid patient and will break analyzeProgression downstream.
  it('SUSPECT: parseImportJSON does no structural validation of an accepted patient', () => {
    expect(parseImportJSON('null')).toEqual({ ok: false, error: 'Invalid JSON file.' })
    const r = parseImportJSON('{"id":5,"visits":"nope"}')
    expect(r).toMatchObject({ ok: true, type: 'patient' })
    expect(() => analyzeProgression(r.data)).toThrow()
  })
})
