/**
 * Golden-case regression suite for progressionEngine.js
 *
 * HISTORY: this suite originally pinned known defects as-is under `// SUSPECT:`
 * markers. Those defects have been fixed and the corresponding tests flipped to
 * assert the CORRECTED behavior; each flip carries a `// FIXED:` note.
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

  // FIXED (defect 12): velocity used ONLY the first and last points while
  // computePSADT did a full regression — two different estimators applied to
  // the same series. Both now fit one shared OLS line over every point.
  it('velocity is a least-squares fit over ALL points, not an endpoint slope', () => {
    // A sustained rise that dips only at the final draw. Endpoint-only slope
    // reads 0 (both ends 4.0); the regression sees the rise the series
    // actually contains.
    const risingThenDip = [
      { date: D(2020, 1, 1), psa: 4 },
      { date: D(2020, 7, 1), psa: 7 },
      { date: D(2021, 1, 1), psa: 9 },
      { date: D(2021, 7, 1), psa: 4 },
    ]
    const endpointSlope = 0 // (4 - 4) / 1.5 yr
    const v = computePSAVelocity(risingThenDip)
    expect(v).not.toBeCloseTo(endpointSlope, 2)
    expect(v).toBeGreaterThan(0)
  })

  it('velocity equals the exact slope for a perfectly linear series', () => {
    // +2.0 ng/mL/yr, sampled three times — the regression must recover it
    // exactly, including through the intermediate point.
    const linear = [
      { date: D(2020, 1, 1), psa: 4 },
      { date: D(2021, 1, 1), psa: 6 },
      { date: D(2022, 1, 1), psa: 8 },
    ]
    // 2 dp: calendar years are not exactly 365.25 days apart
    expect(computePSAVelocity(linear)).toBeCloseTo(2.0, 2)
  })

  it('two draws stamped on the same day are averaged, not double-weighted', () => {
    // Reuses derivedMetrics.collapseDuplicateDates. Without collapsing, the
    // duplicated day would carry twice the leverage in the fit.
    const dup = [
      { date: D(2020, 1, 1), psa: 4 },
      { date: D(2021, 1, 1), psa: 5 },
      { date: D(2021, 1, 1), psa: 7 },
    ]
    const collapsed = [
      { date: D(2020, 1, 1), psa: 4 },
      { date: D(2021, 1, 1), psa: 6 },   // mean of 5 and 7
    ]
    expect(computePSAVelocity(dup)).toBeCloseTo(computePSAVelocity(collapsed), 6)
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

  // FIXED (defect 13a): the guard was `months === null`, so an absent value fell
  // through to `~${Math.round(undefined)} months` and rendered the literal
  // string "~NaN months" into clinical display text. Guarded on finiteness.
  it.each([undefined, NaN, Infinity, -Infinity, 'abc', {}])(
    'formatPSADT(%s) returns null rather than a "NaN" string',
    (bad) => {
      expect(formatPSADT(bad)).toBeNull()
    },
  )
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

  // FIXED (defect 13b): the try/catch never fired — `new Date('garbage')` does
  // not throw, it yields an Invalid Date, and toLocaleDateString then returned
  // the literal "Invalid Date", which was rendered straight into clinical flag
  // text ("Biopsy on Invalid Date showed Grade Group 3"). Validity is now
  // checked explicitly and the raw stored value is shown instead, so a
  // clinician can see what is actually in the record.
  it('an unparseable date falls back to the raw input, never "Invalid Date"', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
    expect(formatDate('2021-13-45')).toBe('2021-13-45')
  })

  it('an unparseable date does not leak "Invalid Date" into flag text', () => {
    const r = analyzeProgression({
      enrollmentGG: 1,
      visits: [{ id: 'v1', date: 'garbage', biopsy: { gg: 3 } }],
    })
    const f = r.flags.find(x => x.code === 'grade_upgrade')
    expect(f.detail).not.toMatch(/Invalid Date/)
    expect(f.detail).toMatch(/garbage/)
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
    expect(r.upgradeEvent).toEqual({
      date: D(2022, 1, 1), fromGG: 1, toGG: 2,
      latestGG: 2, supersededByLower: false,
    })
    expect(r.latestGG).toBe(2)
    expect(r.peakGG).toBe(2)
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

  // FIXED (defect 11 — the most clinically dangerous of the set): only the
  // LATEST biopsy was compared to the enrollment GG, so a patient with a
  // documented GG3 upgrade whose next biopsy sampled GG1 produced
  // upgradeEvent: null and summaryTier 'stable' — the upgrade silently
  // disappeared from the analysis.
  //
  // Prostate biopsy is a SAMPLING procedure. A lower grade on a later pass does
  // not un-find higher-grade disease; it means that pass missed it. A
  // documented upgrade is now permanent and cannot be erased by a later benign
  // result. The later reading is reported alongside it, not instead of it.
  it('a documented upgrade survives a later lower-grade biopsy', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2021, 1, 1), biopsy: { gg: 3 } },
        { id: 'v2', date: D(2022, 1, 1), biopsy: { gg: 1 } },
      ],
    }))
    expect(r.upgradeEvent).not.toBeNull()
    expect(r.upgradeEvent.toGG).toBe(3)
    expect(r.upgradeEvent.date).toBe(D(2021, 1, 1))
    expect(r.upgradeEvent.supersededByLower).toBe(true)
    expect(r.upgradeEvent.latestGG).toBe(1)
    expect(r.latestGG).toBe(1)      // still the most recent sample
    expect(r.peakGG).toBe(3)        // …but the highest ever documented is kept
    expect(r.summaryTier).toBe('progressed')

    // the flag says plainly that the later biopsy does not retract the finding
    const f = r.flags.find(x => x.code === 'grade_upgrade')
    expect(f.severity).toBe('critical')
    expect(f.label).toBe('Grade Group Upgrade: GG1 → GG3')
    expect(f.detail).toMatch(/does NOT retract/)
  })

  it('reports the HIGHEST documented upgrade across a multi-biopsy history', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2021, 1, 1), biopsy: { gg: 2 } },
        { id: 'v2', date: D(2022, 1, 1), biopsy: { gg: 4 } },
        { id: 'v3', date: D(2023, 1, 1), biopsy: { gg: 2 } },
      ],
    }))
    expect(r.upgradeEvent.toGG).toBe(4)
    expect(r.upgradeEvent.date).toBe(D(2022, 1, 1))
    expect(r.peakGG).toBe(4)
    expect(r.summaryTier).toBe('progressed')
  })

  it('a genuinely stable history still raises nothing', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2021, 1, 1), biopsy: { gg: 1 } },
        { id: 'v2', date: D(2022, 1, 1), biopsy: { gg: 1 } },
      ],
    }))
    expect(r.upgradeEvent).toBeNull()
    expect(r.peakGG).toBe(1)
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

  // FIXED (defect 11, MRI half): a falling PI-RADS raises no *progression*
  // flag — correct, nothing worsened. But the earlier PI-RADS 4 is still a
  // PI-RADS 4 on record, and it indicated a targeted biopsy. That indication is
  // discharged by performing the biopsy, not by a later scan reading lower, so
  // the high-PI-RADS flag is retained (with the later reading noted).
  it('improving PI-RADS raises no progression flag, but the prior PI-RADS 4 is retained', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2020, 6, 1), mri: { pirads: 4, newLesion: false } },
        { id: 'v2', date: D(2022, 6, 1), mri: { pirads: 2, newLesion: false } },
      ],
    }))
    expect(r.flags.some(f => f.code === 'mri_progression')).toBe(false)
    const high = r.flags.find(f => f.code === 'mri_pirads_high')
    expect(high).toBeDefined()
    expect(high.label).toBe('PI-RADS 4 on MRI')
    expect(high.detail).toMatch(/was actually performed/)
  })

  it('an all-low MRI history raises no MRI flag at all', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2020, 6, 1), mri: { pirads: 2, newLesion: false } },
        { id: 'v2', date: D(2022, 6, 1), mri: { pirads: 3, newLesion: false } },
      ],
    }))
    expect(r.flags.some(f => f.code.startsWith('mri_'))).toBe(false)
    expect(r.summaryTier).toBe('stable')
  })

  it('a new lesion on the latest MRI is always flagged', () => {
    const r = analyzeProgression(patient({
      visits: [{ id: 'v1', date: D(2021, 1, 1), mri: { pirads: 2, newLesion: true } }],
    }))
    expect(r.flags.some(f => f.code === 'mri_new_lesion')).toBe(true)
  })

  // FIXED (defect 11, MRI half): only the LATEST MRI was checked for a high
  // PI-RADS or a new lesion, so a PI-RADS 5 or a documented new lesion vanished
  // from the analysis the moment a later, quieter MRI was recorded — the record
  // still held the finding, but the patient read as stable. The full history is
  // now considered.
  it('an earlier PI-RADS 5 / new lesion survives a later benign MRI', () => {
    const r = analyzeProgression(patient({
      visits: [
        { id: 'v1', date: D(2020, 6, 1), mri: { pirads: 5, newLesion: true } },
        { id: 'v2', date: D(2022, 6, 1), mri: { pirads: 2, newLesion: false } },
      ],
    }))
    const high = r.flags.find(f => f.code === 'mri_pirads_high')
    expect(high).toBeDefined()
    expect(high.label).toBe('PI-RADS 5 on MRI')

    const lesion = r.flags.find(f => f.code === 'mri_new_lesion')
    expect(lesion).toBeDefined()
    expect(lesion.detail).toMatch(/does not retract it/)

    expect(r.summaryTier).toBe('watch')
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

  // FIXED (defect 13c — DATA LOSS): a corrupt roster blob made JSON.parse
  // throw; the catch swallowed it and execution fell through to the
  // legacy-migration path, which returns an EMPTY roster. Corrupt storage
  // therefore presented as "no patients", and the next saveRoster overwrote the
  // possibly-recoverable original — the data was destroyed simply by opening
  // the app. The blob is now quarantined under a backup key BEFORE anything can
  // overwrite it, and the failure is surfaced on the returned roster.
  it('a corrupt roster blob is preserved and the failure is surfaced', () => {
    const original = '{not json'
    localStorage.setItem(ROSTER_STORAGE_KEY, original)
    const r = loadRoster()

    expect(r.patients).toEqual([])
    expect(r.loadError).toBeDefined()
    expect(r.loadError.code).toBe('corrupt_roster_json')
    expect(r.loadError.recoverable).toBe(true)
    // the original bytes survive under the quarantine key
    expect(localStorage.getItem(r.loadError.backupKey)).toBe(original)
  })

  it('a blob that parses but is not a roster is also quarantined, not treated as empty', () => {
    localStorage.setItem(ROSTER_STORAGE_KEY, '{"something":"else"}')
    const r = loadRoster()
    expect(r.loadError.code).toBe('corrupt_roster_shape')
    expect(localStorage.getItem(r.loadError.backupKey)).toBe('{"something":"else"}')
  })

  it('a subsequent save cannot destroy the quarantined copy, and never persists loadError', () => {
    localStorage.setItem(ROSTER_STORAGE_KEY, '{not json')
    const broken = loadRoster()
    saveRoster(broken)   // the overwrite that used to be the data-loss step
    expect(localStorage.getItem(broken.loadError.backupKey)).toBe('{not json')
    expect(JSON.parse(localStorage.getItem(ROSTER_STORAGE_KEY)).loadError).toBeUndefined()
  })

  it('a valid roster is unaffected and carries no loadError', () => {
    saveRoster({ patients: [{ id: 'a' }], activeId: 'a' })
    const r = loadRoster()
    expect(r.loadError).toBeUndefined()
    expect(r.patients).toHaveLength(1)
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

  // FIXED (defect 13d): a top-level JSON scalar such as `null` or `5` threw on
  // property access INSIDE the try and was misreported as "Invalid JSON file.",
  // sending the user to look for a syntax error that was not there. And no
  // per-field validation was done at all: `{"id":5,"visits":"nope"}` was
  // accepted as a valid patient and then threw inside analyzeProgression, long
  // after the import had been reported as successful.
  it('a valid-JSON non-record is reported as an unrecognized structure, not invalid JSON', () => {
    for (const text of ['null', '5', '"hello"', '[1,2]']) {
      expect(parseImportJSON(text)).toEqual({ ok: false, error: 'Unrecognized JSON structure.' })
    }
    // genuinely malformed JSON is still reported as such
    expect(parseImportJSON('{not json')).toEqual({ ok: false, error: 'Invalid JSON file.' })
  })

  it('structurally malformed patient records are rejected at the import boundary', () => {
    const bad = [
      '{"id":5,"visits":"nope"}',
      '{"id":"pt_1","visits":"nope"}',
      '{"id":"pt_1","visits":[null]}',
      '{"id":"pt_1","visits":[{"biopsy":"gg3"}]}',
      '{"id":"pt_1","enrollmentGG":9}',
      '{"enrollmentDate":123}',
    ]
    for (const text of bad) {
      const r = parseImportJSON(text)
      expect(r.ok).toBe(false)
      expect(r.error).toEqual(expect.any(String))
    }
  })

  it('malformed patients inside a roster are rejected too', () => {
    expect(parseImportJSON('{"patients":[{"id":"a"},{"id":"b","visits":"nope"}]}').ok).toBe(false)
    expect(parseImportJSON('{"patients":[{"id":"a"},{"id":"b","visits":[]}]}').ok).toBe(true)
  })

  it('an accepted patient record is safe to hand straight to analyzeProgression', () => {
    const r = parseImportJSON('{"id":"pt_1","enrollmentGG":1,"visits":[{"id":"v1","date":"2022-01-01","biopsy":{"gg":2}}]}')
    expect(r.ok).toBe(true)
    expect(() => analyzeProgression(r.data)).not.toThrow()
    expect(analyzeProgression(r.data).summaryTier).toBe('progressed')
  })

  it('analyzeProgression itself degrades safely on a malformed record', () => {
    // defence in depth: even if a bad record reaches the analyser, it returns
    // an analysis rather than throwing partway through.
    for (const bad of [null, undefined, 5, 'x', { visits: 'nope' }, { visits: [null] }]) {
      expect(() => analyzeProgression(bad)).not.toThrow()
      expect(analyzeProgression(bad).summaryTier).toBe('stable')
    }
  })
})
