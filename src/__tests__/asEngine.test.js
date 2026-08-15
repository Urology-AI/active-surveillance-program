/**
 * Golden-case regression suite for asEngine.js
 *
 * These tests assert the engine's behavior, discovered by reading the source.
 * They are a regression net, not a restatement of clinical intent.
 *
 * HISTORY: this suite originally pinned 15 defects as-is under `// SUSPECT:`
 * markers. Those defects have now been fixed in the engine and the
 * corresponding tests flipped to assert the CORRECTED behavior; each flip
 * carries a `// FIXED:` note explaining what changed and why.
 */
import { describe, it, expect } from 'vitest'
import {
  runAssessment,
  validateInputs,
  calcUpgradeRisk,
  calcOutcomesPrediction,
  GUIDELINE_HARD_STOPS,
  COHORT_CALIBRATION,
  MODEL_VALIDATION,
  UPGRADE_RISK_MODEL,
} from '../asEngine.js'

// Minimal input that passes validateInputs and lands in the lowest tier.
// score: GG1 0 + cores(<3) 0 + maxCore 0 + PSAD 0.100 (0) + PI-RADS 2 (-3) = -3
// NOTE: PSAD 0.100 scores 0, not -5. The "very low" -5 bucket now ends at the
// cohort-supported Youden cutoff 0.065 rather than the unsourced 0.10 — see the
// PSAD threshold block below.
const base = Object.freeze({
  ggg: 1,
  positiveCores: 1,
  totalCores: 12,
  maxCorePercent: 20,
  psa: 5,
  prostateVolume: 50,
  pirads: 2,
})
const withBase = (o = {}) => ({ ...base, ...o })
const tierOf = (o = {}) => runAssessment(withBase(o)).combinedTierKey
const scoreOf = (o = {}) => runAssessment(withBase(o)).asScore

// PSAD is psa/prostateVolume; hold psa at 5 and vary volume to hit exact PSADs.
const volForPsad = (psad) => 5 / psad

describe('baseline sanity', () => {
  it('lowest-risk case is standard_as with score -3', () => {
    const r = runAssessment(base)
    expect(r.hardStop).toBe(false)
    expect(r.asScore).toBe(-3)
    expect(r.asTierKey).toBe('standard_as')
    expect(r.monitoringTier).toBe('standard')
    expect(r.featureCount).toBe(0)
    expect(r.combinedTierKey).toBe('standard_as')
    expect(r.combinedColor).toBe('green')
    expect(r.psad).toBeCloseTo(0.1, 10)
  })

  it('returns both layers as separate objects', () => {
    const r = runAssessment(base)
    expect(r.guidelineLayer.combinedTierKey).toBe('standard_as')
    expect(r.cohortLayer).toBe(r.cohortContext)
    expect(r.cohortContext.cohortN).toBe(1213)
    expect(r.modelValidation).toBe(MODEL_VALIDATION)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 1 — HARD STOPS
// ═══════════════════════════════════════════════════════════════════════════
describe('LAYER 1 hard stops', () => {
  it('exposes exactly two hard stops', () => {
    expect(GUIDELINE_HARD_STOPS.map(s => s.id)).toEqual(['ggg4_5', 'psma_metastatic'])
  })

  it('GG4 triggers the ggg4_5 hard stop', () => {
    const r = runAssessment(withBase({ ggg: 4 }))
    expect(r.hardStop).toBe(true)
    expect(r.hardStopId).toBe('ggg4_5')
    expect(r.hardStopOutcome).toBe('treatment_required')
    expect(r.combinedTierKey).toBe('treatment_required')
    expect(r.combinedColor).toBe('red')
    expect(r.cohortContext.cohortItems).toEqual([])
    expect(r.cohortLayer).toBeNull()
    expect(r.outcomesData).toBeNull()
  })

  it('GG5 triggers the same hard stop', () => {
    expect(runAssessment(withBase({ ggg: 5 })).hardStopId).toBe('ggg4_5')
  })

  it('GG3 is just below the hard stop and proceeds to scoring', () => {
    const r = runAssessment(withBase({ ggg: 3 }))
    expect(r.hardStop).toBe(false)
    // GG3 = 22 pts, so -3 + 22 = 19
    expect(r.asScore).toBe(19)
    expect(r.asTierKey).toBe('enhanced_as')
  })

  it('PSMA metastatic triggers the psma_metastatic hard stop', () => {
    const r = runAssessment(withBase({ psmaFinding: 'metastatic' }))
    expect(r.hardStop).toBe(true)
    expect(r.hardStopId).toBe('psma_metastatic')
    expect(r.hardStopOutcome).toBe('systemic_treatment')
    expect(r.combinedTierKey).toBe('systemic_treatment')
  })

  it('GGG hard stop takes precedence over PSMA (declaration order)', () => {
    expect(runAssessment(withBase({ ggg: 5, psmaFinding: 'metastatic' })).hardStopId).toBe('ggg4_5')
  })

  it('PSMA regional is NOT a hard stop', () => {
    expect(runAssessment(withBase({ psmaFinding: 'regional' })).hardStop).toBe(false)
  })

  // FIXED (defect 3): `enc.ggg` maps only {1,2,3} and used to fall through
  // `?? 0`, so GG4/GG5 were encoded — and scored — as GG1: a GG5 patient and a
  // GG1 patient were shown the SAME 24% upgrade probability. Worse, the GG
  // coefficient is negative, so a "corrected" ordinal would have reported GG5
  // as lower-risk than GG1. The model is fitted on GG1–GG3 only, so it now
  // declines to produce a number above its training range rather than guessing.
  it('GG4/GG5 are outside the model training range and get no probability', () => {
    for (const ggg of [4, 5]) {
      const r = calcUpgradeRisk(withBase({ ggg }))
      expect(r.available).toBe(false)
      expect(r.probability).toBeUndefined()
      expect(r.reason).toMatch(/GG1–GG3/)
    }
    // GG1–GG3 remain scoreable and distinct from one another
    expect(calcUpgradeRisk(base).available).toBe(true)
    expect(calcUpgradeRisk(withBase({ ggg: 2 })).probability)
      .not.toBe(calcUpgradeRisk(base).probability)
  })

  // FIXED (defect 3b): the hard-stop return path used to call calcUpgradeRisk()
  // and display a surveillance upgrade probability for a patient already ruled
  // ineligible for surveillance — two contradictory messages on one screen.
  // Layer 3 is now suppressed there, with an explicit reason rather than a
  // silently-missing field.
  it('hard-stop cases have Layer 3 suppressed with an explicit reason', () => {
    const r = runAssessment(withBase({ ggg: 5 }))
    expect(r.upgradeRisk.available).toBe(false)
    expect(r.upgradeRisk.suppressedBy).toBe('ggg4_5')
    expect(r.upgradeRisk.probability).toBeUndefined()
    expect(r.upgradeRisk.reason).toMatch(/not applicable/)

    // …and for a hard stop the model COULD have scored (GG1 + metastatic PSMA),
    // suppression is still the behavior: no upgrade % beside "AS contraindicated".
    const met = runAssessment(withBase({ psmaFinding: 'metastatic' }))
    expect(met.upgradeRisk.available).toBe(false)
    expect(met.upgradeRisk.suppressedBy).toBe('psma_metastatic')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 1 — INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
describe('validateInputs', () => {
  it('accepts the base case with no errors', () => {
    expect(validateInputs(base)).toEqual({})
  })

  it.each([
    ['null ggg', { ggg: null }, 'ggg'],
    ['ggg 0', { ggg: 0 }, 'ggg'],
    ['ggg 6', { ggg: 6 }, 'ggg'],
    ['missing positiveCores', { positiveCores: '' }, 'positiveCores'],
    ['negative positiveCores', { positiveCores: -1 }, 'positiveCores'],
    ['fractional positiveCores', { positiveCores: 1.5 }, 'positiveCores'],
    ['totalCores 0', { totalCores: 0 }, 'totalCores'],
    ['null totalCores', { totalCores: null }, 'totalCores'],
    ['positiveCores > totalCores', { positiveCores: 13, totalCores: 12 }, 'positiveCores'],
    ['maxCorePercent -1', { maxCorePercent: -1 }, 'maxCorePercent'],
    ['maxCorePercent 101', { maxCorePercent: 101 }, 'maxCorePercent'],
    ['maxCorePercent empty', { maxCorePercent: '' }, 'maxCorePercent'],
    ['psa 0', { psa: 0 }, 'psa'],
    ['negative psa', { psa: -1 }, 'psa'],
    ['psa 101', { psa: 101 }, 'psa'],
    ['psa empty', { psa: '' }, 'psa'],
    ['prostateVolume 0', { prostateVolume: 0 }, 'prostateVolume'],
    ['prostateVolume 501', { prostateVolume: 501 }, 'prostateVolume'],
    ['null pirads', { pirads: null }, 'pirads'],
    ['decipher 1.01', { decipher: 1.01 }, 'decipher'],
    ['decipher -0.01', { decipher: -0.01 }, 'decipher'],
    ['gps 101', { gps: 101 }, 'gps'],
    ['prolaris 10.1', { prolaris: 10.1 }, 'prolaris'],
    ['age 17', { age: 17 }, 'age'],
    ['age 121', { age: 121 }, 'age'],
    ['negative psaVelocity', { psaVelocity: -1 }, 'psaVelocity'],
    ['negative psaDoublingTime', { psaDoublingTime: -1 }, 'psaDoublingTime'],
  ])('rejects %s', (_label, patch, key) => {
    expect(validateInputs(withBase(patch))).toHaveProperty(key)
  })

  it.each([
    ['maxCorePercent 0', { maxCorePercent: 0 }],
    ['maxCorePercent 100', { maxCorePercent: 100 }],
    ['psa exactly 100', { psa: 100 }],
    ['prostateVolume exactly 500', { prostateVolume: 500 }],
    ['positiveCores === totalCores', { positiveCores: 12, totalCores: 12 }],
    ['positiveCores 0', { positiveCores: 0 }],
    ['totalCores 1', { totalCores: 1, positiveCores: 1 }],
    ['decipher 0', { decipher: 0 }],
    ['decipher 1', { decipher: 1 }],
    ['gps 0 / gps 100', { gps: 100 }],
    ['prolaris 10', { prolaris: 10 }],
    ['age 18 / 120', { age: 120 }],
    ['pirads 0 (no MRI)', { pirads: 0 }],
  ])('accepts boundary %s', (_label, patch) => {
    expect(validateInputs(withBase(patch))).toEqual({})
  })

  // SUSPECT: src/asEngine.js:419-420 — pirads is only checked for null, never
  // range-checked. PI-RADS 6 (or 99) passes validation and reaches calcBasic,
  // where ptsMap[6] is undefined so it scores 0 points and falls into the
  // `p === 5` else-branch text ("very high probability"). Asserting current
  // behavior.
  it('SUSPECT: PI-RADS 6 passes validation and scores 0 pts with PI-RADS-5 wording', () => {
    expect(validateInputs(withBase({ pirads: 6 }))).toEqual({})
    const r = runAssessment(withBase({ pirads: 6 }))
    const f = r.asFactors.find(x => x.label === 'PI-RADS 6')
    expect(f.points).toBe(0)
    expect(f.tier).toBe('intermediate')
    expect(f.basis).toMatch(/very high probability/)
    // still counted as ≥4 by the monitoring sub-model
    expect(r.features.some(x => /PI-RADS 6/.test(x.label))).toBe(true)
  })

  it('runAssessment throws on invalid input', () => {
    expect(() => runAssessment(withBase({ psa: -1 }))).toThrow(/Invalid inputs/)
    expect(() => runAssessment(withBase({ ggg: null }))).toThrow(/Invalid inputs/)
    expect(() => runAssessment({})).toThrow(/Invalid inputs/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// SUB-MODEL 1 — BASIC + PSAD
// ═══════════════════════════════════════════════════════════════════════════
describe('sub-model 1: GGG points', () => {
  it.each([[1, 0], [2, 8], [3, 22]])('GG%i contributes %i points', (ggg, pts) => {
    expect(scoreOf({ ggg })).toBe(-3 + pts)
  })
})

describe('sub-model 1: positive-core count gate (NCCN < 3)', () => {
  // gate is an absolute count, ratio only grades severity among failures
  it('2 positive cores (just below 3) scores 0', () => {
    const f = runAssessment(withBase({ positiveCores: 2, totalCores: 12 })).asFactors[1]
    expect(f.points).toBe(0)
    expect(f.tier).toBe('low')
    expect(f.basis).toMatch(/Meets NCCN 2024 very low risk core criterion/)
  })

  it('2/4 cores (50% ratio) still passes the count gate', () => {
    expect(runAssessment(withBase({ positiveCores: 2, totalCores: 4 })).asFactors[1].points).toBe(0)
  })

  it.each([
    ['3/24 — ratio 12.5%, fails count gate', 3, 24, 1, 'low'],
    ['9/24 — ratio 37.5% (> 1/3)', 9, 24, 3, 'intermediate'],
    // FIXED (defect 9): 8/24 is EXACTLY one third. Under the old literal-0.33
    // cutoff it read as 0.3333… > 0.33 and scored 3 pts 'intermediate'; against
    // an exact 1/3 it is not greater than the cutoff and scores 1 pt, the same
    // as any other one-third burden.
    ['8/24 — ratio exactly 1/3 (not greater than the 1/3 cutoff)', 8, 24, 1, 'low'],
    ['12/24 — ratio exactly 0.50', 12, 24, 3, 'intermediate'],
    ['13/24 — ratio 54% (>0.50)', 13, 24, 6, 'high'],
  ])('%s', (_l, positiveCores, totalCores, pts, tier) => {
    const f = runAssessment(withBase({ positiveCores, totalCores })).asFactors[1]
    expect(f.points).toBe(pts)
    expect(f.tier).toBe(tier)
  })

  // FIXED (defect 9): the buckets compared against the literal 0.33 rather than
  // 1/3, so 4/12 (0.33333…) scored 3 pts while 33/100 (0.33) scored 1 pt — two
  // clinically identical one-third burdens landing in different tiers purely on
  // decimal rounding. Exact fractions make one-third burdens agree.
  it('one-third core burdens score identically regardless of how the fraction is expressed', () => {
    const pts = (positiveCores, totalCores) =>
      runAssessment(withBase({ positiveCores, totalCores })).asFactors[1].points
    expect(pts(4, 12)).toBe(1)    // exactly 1/3 — no longer over the cutoff
    expect(pts(8, 24)).toBe(1)    // exactly 1/3
    expect(pts(33, 100)).toBe(1)  // just under 1/3
    // …and a burden genuinely above one third still escalates
    expect(pts(34, 100)).toBe(3)
    expect(pts(5, 12)).toBe(3)
    // the 1/2 boundary is likewise exact: 1/2 is not > 1/2
    expect(pts(12, 24)).toBe(3)
    expect(pts(13, 24)).toBe(6)
  })
})

describe('sub-model 1: max core involvement (NCCN 50%)', () => {
  it.each([
    [49, 0, 'low'],
    [50, 0, 'low'],   // exactly at threshold — still within NCCN
    [51, 4, 'intermediate'],
    [100, 4, 'intermediate'],
  ])('maxCorePercent %i → %i pts', (maxCorePercent, pts, tier) => {
    const f = runAssessment(withBase({ maxCorePercent })).asFactors[2]
    expect(f.points).toBe(pts)
    expect(f.tier).toBe(tier)
  })

  it('>50% adds a monitoring feature; exactly 50% does not', () => {
    expect(runAssessment(withBase({ maxCorePercent: 50 })).featureCount).toBe(0)
    expect(runAssessment(withBase({ maxCorePercent: 51 })).featureCount).toBe(1)
  })
})

describe('sub-model 1: PSAD thresholds', () => {
  const psadFactor = (psad) =>
    runAssessment(withBase({ psa: 5, prostateVolume: volForPsad(psad) }))
      .asFactors.find(f => f.label.startsWith('PSA Density'))

  it.each([
    [0.05,   -5, 'low'],
    [0.0649, -5, 'low'],
    [0.065,  -5, 'low'],   // exactly at Youden cutoff — still -5 (strict >)
    // FIXED (defect 14): the "very low" -5 bucket used to run all the way to
    // 0.10, a value found nowhere in COHORT_CALIBRATION.psad. It now ends at
    // the cohort's own Youden-optimal 0.065, so these three cases score 0.
    [0.0651,  0, 'low'],
    [0.0999,  0, 'low'],
    [0.10,    0, 'low'],
    [0.1001,  0, 'low'],
    [0.1499,  0, 'low'],
    [0.15,    0, 'low'],   // exactly at NCCN — still 0 (strict >)
    [0.1501,  5, 'intermediate'],
    [0.1769,  5, 'intermediate'],
    [0.177,   5, 'intermediate'], // exactly at Kadeer — still 5 (strict >)
    [0.1771, 12, 'high'],
    [0.30,   12, 'high'],
  ])('PSAD %f → %i pts', (psad, pts, tier) => {
    const f = psadFactor(psad)
    expect(f.points).toBe(pts)
    expect(f.tier).toBe(tier)
  })

  // FIXED (defect 14 — TIER 2, CLINICIAN SIGN-OFF REQUIRED): the scoring bands
  // and the `basis` narrative used DIFFERENT cut-points. Scoring handed the
  // maximally favourable -5 bucket to anything ≤ 0.10 while the narrative (and
  // the Layer 2 cohort item, and calcOutcomesPrediction) branched at 0.065. A
  // patient at PSAD 0.08 was scored "very low risk" while simultaneously being
  // told they sat in the 0.065–0.15 tier with a 23.9% upgrade rate.
  //
  // Resolved toward CAUTION, in favour of the boundary the data supports: 0.065
  // is COHORT_CALIBRATION.psad.youden_optimal, derived from the N=704 GG1
  // subset. The value 0.10 appears nowhere in the cohort data. Patients in
  // 0.065–0.10 now score 0 rather than -5 — a less favourable score, matching
  // the tier they were already being shown.
  it('score and narrative now agree on the 0.065 boundary', () => {
    for (const psad of [0.0651, 0.08, 0.0999, 0.10]) {
      const f = psadFactor(psad)
      expect(f.points).toBe(0)   // no longer the "very low" bonus
      expect(f.basis).toMatch(/PSAD 0\.065–0\.15 — intermediate risk tier/)
      const item = runAssessment(withBase({ psa: 5, prostateVolume: volForPsad(psad) }))
        .cohortContext.cohortItems.find(i => i.variable === 'psad')
      expect(item.label).toMatch(/0\.065–0\.15/)
    }
    // …and only a genuinely sub-0.065 patient gets the -5 "very low" score,
    // with narrative and cohort item that agree with it.
    for (const psad of [0.05, 0.0649, 0.065]) {
      expect(psadFactor(psad).points).toBe(-5)
      expect(psadFactor(psad).basis).toMatch(/PSAD < 0\.065/)
    }
    const lowItem = runAssessment(withBase({ psa: 5, prostateVolume: volForPsad(0.05) }))
      .cohortContext.cohortItems.find(i => i.variable === 'psad')
    expect(lowItem.label).toMatch(/< 0\.065/)
  })

  it('PSAD > 0.177 adds a monitoring feature', () => {
    expect(runAssessment(withBase({ prostateVolume: volForPsad(0.177) })).featureCount).toBe(0)
    expect(runAssessment(withBase({ prostateVolume: volForPsad(0.178) })).featureCount).toBe(1)
  })

  it('falls back to raw PSA bands when prostate volume is absent', () => {
    const psaFactor = (psa) => {
      const r = runAssessment({ ...base, psa, prostateVolume: undefined })
      expect(r.psad).toBeNull()
      return r.asFactors.find(f => f.label.startsWith('PSA '))
    }
    expect(psaFactor(3.9).points).toBe(-3)
    expect(psaFactor(4).points).toBe(0)     // exactly 4 → intermediate band
    expect(psaFactor(9.99).points).toBe(0)
    expect(psaFactor(10).points).toBe(10)   // exactly 10 → high band (>=)
    expect(psaFactor(10).tier).toBe('high')
  })

  it('PSA >= 10 adds a monitoring feature regardless of PSAD', () => {
    expect(runAssessment(withBase({ psa: 9.9, prostateVolume: 200 })).featureCount).toBe(0)
    expect(runAssessment(withBase({ psa: 10, prostateVolume: 200 })).featureCount).toBe(1)
  })
})

describe('sub-model 1: PI-RADS points', () => {
  it.each([[1, -5, 'low'], [2, -3, 'low'], [3, 0, 'intermediate'], [4, 8, 'high'], [5, 15, 'high']])(
    'PI-RADS %i → %i pts',
    (pirads, pts, tier) => {
      const f = runAssessment(withBase({ pirads })).asFactors.find(x => x.label === `PI-RADS ${pirads}`)
      expect(f.points).toBe(pts)
      expect(f.tier).toBe(tier)
    },
  )

  it('PI-RADS 0 means "no MRI": no scoring factor, but a monitoring feature', () => {
    const r = runAssessment(withBase({ pirads: 0 }))
    expect(r.asFactors.some(f => f.label.startsWith('PI-RADS'))).toBe(false)
    expect(r.asScore).toBe(0) // -3 minus the PI-RADS 2 (-3) contribution
    expect(r.features.some(f => /No mpMRI performed/.test(f.label))).toBe(true)
  })

  it('PI-RADS >= 4 adds a monitoring feature; 3 does not', () => {
    expect(runAssessment(withBase({ pirads: 3 })).featureCount).toBe(0)
    expect(runAssessment(withBase({ pirads: 4 })).featureCount).toBe(1)
  })
})

describe('sub-model 1: score → tier boundaries (3 / 20 / 45)', () => {
  // Drive the score with GGG + PI-RADS + cores rather than asserting arithmetic twice.
  it('score 3 is still standard_as, score 4 is enhanced_as', () => {
    // GG2(8) + PI-RADS 1(-5) + PSAD 0.15(0) + cores 0 + maxcore 0 = 3
    const v = volForPsad(0.15)
    expect(scoreOf({ ggg: 2, pirads: 1, prostateVolume: v })).toBe(3)
    expect(runAssessment(withBase({ ggg: 2, pirads: 1, prostateVolume: v })).asTierKey).toBe('standard_as')
    // GG2(8) + PI-RADS 3(0) + PSAD 0.10(-5) + cores(13/24 → 6) = 9  … use a direct 4
    // GG2(8) + PI-RADS 2(-3) + PSAD 0.15(0) = 5 → enhanced
    expect(runAssessment(withBase({ ggg: 2, prostateVolume: v })).asTierKey).toBe('enhanced_as')
  })

  it('score 20 is enhanced_as, score 21 is intensive_as', () => {
    // GG3(22) + PI-RADS 2(-3) + PSAD 0.10(0) + cores 0 = 19 (enhanced)
    expect(scoreOf({ ggg: 3 })).toBe(19)
    expect(runAssessment(withBase({ ggg: 3 })).asTierKey).toBe('enhanced_as')
    // exactly 20: GG3(22) + PI-RADS 2(-3) + PSAD 0.10(0) + cores 3/24(1) = 20
    const at20 = runAssessment(withBase({ ggg: 3, positiveCores: 3, totalCores: 24 }))
    expect(at20.asScore).toBe(20)
    expect(at20.asTierKey).toBe('enhanced_as')
    // exactly 21: GG2(8) + PI-RADS 4(8) + PSAD 0.16(5) + cores 0 + maxCore 0 = 21
    const at21 = runAssessment(withBase({ ggg: 2, pirads: 4, prostateVolume: volForPsad(0.16) }))
    expect(at21.asScore).toBe(21)
    expect(at21.asTierKey).toBe('intensive_as')
  })

  it('very high composite score reaches the basic-model treatment tier', () => {
    // GG3(22) + PI-RADS 5(15) + PSAD >0.177(12) + maxCore 100(4) + cores 13/24(6) = 59
    const r = runAssessment(withBase({
      ggg: 3, pirads: 5, prostateVolume: volForPsad(0.25),
      maxCorePercent: 100, positiveCores: 13, totalCores: 24,
    }))
    expect(r.asScore).toBe(59)
    expect(r.asTierKey).toBe('treatment')
    expect(r.combinedTierKey).toBe('treatment_discussion')
  })
})

describe('sub-model 1: logistic upgradeProbability (calcBasic)', () => {
  it('uses the PSAD model when volume is available', () => {
    const r = runAssessment(base)
    expect(r.upgradeProbabilityModel).toBe('GGG + PSAD + Cores (AUC 0.668, N=781)')
    expect(r.upgradeProbability).toBeCloseTo(0.183, 3)
  })

  it('falls back to the no-PSAD model when volume is absent', () => {
    const r = runAssessment({ ...base, prostateVolume: undefined })
    expect(r.upgradeProbabilityModel).toBe('GGG + Cores (AUC 0.609, N=1,197)')
    expect(r.upgradeProbability).toBeCloseTo(0.132, 3)
  })

  it('GG2 lowers the modelled probability (cohort selection effect)', () => {
    expect(runAssessment(withBase({ ggg: 2 })).upgradeProbability)
      .toBeLessThan(runAssessment(base).upgradeProbability)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// SUB-MODEL 2 — GENOMIC
// ═══════════════════════════════════════════════════════════════════════════
describe('sub-model 2: genomic', () => {
  it('is not assessed when no genomic input is present', () => {
    const r = runAssessment(base)
    expect(r.genomicAssessed).toBe(false)
    expect(r.genomicRiskTier).toBeNull()
    expect(r.genomicScore).toBeNull()
  })

  it.each([
    ['decipher 0.44', { decipher: 0.44 }, -10],
    ['decipher 0.45 (exactly)', { decipher: 0.45 }, 8],
    ['decipher 0.59', { decipher: 0.59 }, 8],
    ['decipher 0.60 (exactly)', { decipher: 0.6 }, 15],
    ['gps 19', { gps: 19 }, -8],
    ['gps 20 (exactly)', { gps: 20 }, 5],
    ['gps 39', { gps: 39 }, 5],
    ['gps 40 (exactly)', { gps: 40 }, 12],
    ['prolaris 1.4', { prolaris: 1.4 }, -8],
    ['prolaris 1.5 (exactly)', { prolaris: 1.5 }, 5],
    ['prolaris 2.0', { prolaris: 2.0 }, 5],
    ['prolaris 2.1 (exactly)', { prolaris: 2.1 }, 12],
    ['confirmMDx positive', { confirmMDx: 'positive' }, 10],
    ['confirmMDx negative', { confirmMDx: 'negative' }, -8],
  ])('%s → genomicScore %i', (_l, patch, score) => {
    const r = runAssessment(withBase(patch))
    expect(r.genomicAssessed).toBe(true)
    expect(r.genomicScore).toBe(score)
  })

  it('confirmMDx "not_done" and empty strings do not count as assessed', () => {
    expect(runAssessment(withBase({ confirmMDx: 'not_done' })).genomicAssessed).toBe(false)
    expect(runAssessment(withBase({ decipher: '', gps: '', prolaris: '' })).genomicAssessed).toBe(false)
  })

  it.each([
    ['score -10 → low', { decipher: 0.44 }, 'low'],
    ['score -5 exactly → low', { decipher: 0.44, gps: 20 }, 'low'],
    ['score -4 → intermediate', { gps: 19, decipher: 0.45 }, 'intermediate'],
    ['score 10 exactly → intermediate', { confirmMDx: 'positive' }, 'intermediate'],
    ['score 12 → high', { gps: 40 }, 'high'],
    ['score 15 → high', { decipher: 0.6 }, 'high'],
  ])('tier boundary: %s', (_l, patch, tier) => {
    expect(runAssessment(withBase(patch)).genomicRiskTier).toBe(tier)
  })

  it('high genomic risk escalates the combined tier by one level', () => {
    expect(tierOf()).toBe('standard_as')
    // decipher 0.60 → genomic high; basic tier stays standard_as
    const r = runAssessment(withBase({ decipher: 0.6 }))
    expect(r.asTierKey).toBe('standard_as')
    expect(r.genomicRiskTier).toBe('high')
    // high genomic also adds a monitoring feature → enhanced monitoring (level 1),
    // then genomic-high escalation adds one more → intensive_as
    expect(r.monitoringTier).toBe('enhanced')
    expect(r.combinedTierKey).toBe('intensive_as')
  })

  it('genomic escalation is capped at treatment_discussion', () => {
    const r = runAssessment(withBase({
      ggg: 3, pirads: 5, prostateVolume: volForPsad(0.25),
      maxCorePercent: 100, positiveCores: 13, totalCores: 24, decipher: 0.9,
    }))
    expect(r.combinedTierKey).toBe('treatment_discussion')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// SUB-MODEL 3 — PSMA
// ═══════════════════════════════════════════════════════════════════════════
describe('sub-model 3: PSMA', () => {
  it.each([
    [undefined, false, null],
    ['not_done', false, null],
    ['bogus_value', false, null],
  ])('psmaFinding %s → not assessed', (psmaFinding, assessed, score) => {
    const r = runAssessment(withBase({ psmaFinding }))
    expect(r.psmaAssessed).toBe(assessed)
    expect(r.psmaScore).toBe(score)
  })

  it.each([
    ['negative', -15, 'low'],
    ['local', 0, 'intermediate'],
    ['regional', 25, 'high'],
  ])('psmaFinding %s → %i pts', (psmaFinding, pts, tier) => {
    const r = runAssessment(withBase({ psmaFinding }))
    expect(r.psmaAssessed).toBe(true)
    expect(r.psmaScore).toBe(pts)
    expect(r.psmaFactors[0].tier).toBe(tier)
  })

  // REVIEWED (defect 10) — NOT A DEFECT; the behavior is deliberate and is now
  // documented in the engine and pinned here as an invariant.
  //
  // psmaScore is displayed for transparency but never added to asScore. PSMA
  // influences the tier through FINDINGS, not points: 'metastatic' is a hard
  // stop, 'regional' forces at least intensive_as, 'local' counts as a
  // monitoring feature. Wiring the points in would change clinical output in
  // the UNSAFE direction — a negative PSMA PET (-15 pts) would subtract from
  // the composite and could pull a patient with genuine biopsy/PSAD risk
  // features DOWN a tier, on a scan whose negative predictive value for occult
  // higher-grade disease in an AS population is not established here (the
  // N=1,213 cohort has no PSMA stratum at all). Escalation via findings can
  // only raise a tier; scoring would let it lower one.
  //
  // FLAGGED FOR CLINICIAN REVIEW: should a negative PSMA PET ever be allowed to
  // de-escalate surveillance intensity? Until that is answered with data, no.
  it('psmaScore is informational only and can never lower a tier', () => {
    // reported, but not summed into the composite
    expect(runAssessment(withBase({ psmaFinding: 'negative' })).psmaScore).toBe(-15)
    expect(runAssessment(withBase({ psmaFinding: 'negative' })).asScore).toBe(scoreOf())
    expect(runAssessment(withBase({ psmaFinding: 'negative' })).combinedTierKey).toBe('standard_as')

    // the load-bearing safety property: a negative PSMA PET cannot de-escalate
    // a patient who has genuine risk features from other sub-models
    const risky = { abutment: 'yes', ece: 'yes', broadContact: 'yes' }
    const withoutPsma = runAssessment(withBase(risky))
    const withNegPsma = runAssessment(withBase({ ...risky, psmaFinding: 'negative' }))
    expect(withoutPsma.combinedTierKey).toBe('intensive_as')
    expect(withNegPsma.combinedTierKey).toBe('intensive_as')
    expect(withNegPsma.asScore).toBe(withoutPsma.asScore)
  })

  it('PSMA local adds a monitoring feature', () => {
    expect(runAssessment(withBase({ psmaFinding: 'local' })).featureCount).toBe(1)
    expect(runAssessment(withBase({ psmaFinding: 'local' })).combinedTierKey).toBe('enhanced_as')
  })

  it('PSMA regional escalates to at least intensive_as', () => {
    const r = runAssessment(withBase({ psmaFinding: 'regional' }))
    expect(r.asTierKey).toBe('standard_as')
    expect(r.combinedTierKey).toBe('intensive_as')
  })

  it('lesionCount is reported for non-negative findings only', () => {
    expect(runAssessment(withBase({ psmaFinding: 'regional', lesionCount: 3 })).psmaFactors).toHaveLength(2)
    expect(runAssessment(withBase({ psmaFinding: 'negative', lesionCount: 3 })).psmaFactors).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// SUB-MODEL 4 — INTENSIVE MONITORING
// ═══════════════════════════════════════════════════════════════════════════
describe('sub-model 4: monitoring feature detection', () => {
  it.each([
    ['abutment yes', { abutment: 'yes' }],
    ['ECE yes', { ece: 'yes' }],
    ['broadContact yes', { broadContact: 'yes' }],
    ['age 49', { age: 49 }],
    ['psaVelocity 2', { psaVelocity: 2 }],
    ['psaDoublingTime 2.9', { psaDoublingTime: 2.9 }],
    ['germline BRCA2', { germlineVariant: 'brca2' }],
    ['germline HOXB13', { germlineVariant: 'hoxb13' }],
  ])('%s adds exactly one feature', (_l, patch) => {
    expect(runAssessment(withBase(patch)).featureCount).toBe(1)
  })

  it.each([
    ['age 50 (exactly)', { age: 50 }],
    ['psaVelocity 1.99', { psaVelocity: 1.99 }],
    ['psaDoublingTime 3 (exactly)', { psaDoublingTime: 3 }],
    ['abutment no', { abutment: 'no' }],
    ['ece no', { ece: 'no' }],
    ['germlineVariant none', { germlineVariant: 'none' }],
  ])('%s adds no feature', (_l, patch) => {
    expect(runAssessment(withBase(patch)).featureCount).toBe(0)
  })

  // SUSPECT: src/asEngine.js:855 — PSA doubling time is only flagged when
  // `> 0 && < 3`. A PSADT of exactly 0 (or any recorded 0, which would mean an
  // instantaneous doubling — maximally aggressive) is silently ignored, as is
  // an empty string. The lower guard excludes the worst case.
  it('SUSPECT: PSA doubling time of 0 raises no feature', () => {
    expect(runAssessment(withBase({ psaDoublingTime: 0 })).featureCount).toBe(0)
    expect(runAssessment(withBase({ psaDoublingTime: 0.1 })).featureCount).toBe(1)
  })

  it.each([
    [0, 'standard', 'Standard Active Surveillance'],
    [1, 'enhanced', 'Enhanced Surveillance'],
    [2, 'enhanced', 'Enhanced Surveillance'],
    [3, 'intensive', 'Intensive Surveillance'],
    [4, 'intensive', 'Intensive Surveillance'],
    [5, 'treatment_discussion', 'Treatment Discussion Strongly Recommended'],
  ])('%i features → %s tier', (n, tier, label) => {
    const triggers = [
      { abutment: 'yes' }, { ece: 'yes' }, { broadContact: 'yes' },
      { age: 40 }, { germlineVariant: 'brca2' },
    ]
    const patch = Object.assign({}, ...triggers.slice(0, n))
    const r = runAssessment(withBase(patch))
    expect(r.featureCount).toBe(n)
    expect(r.monitoringTier).toBe(tier)
    expect(r.monitoringLabel).toBe(label)
    expect(r.monitoringSchedule.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED TIER
// ═══════════════════════════════════════════════════════════════════════════
describe('combined tier assignment', () => {
  it('takes the max of the basic and monitoring tiers', () => {
    // basic standard (level 0), monitoring intensive (level 2)
    const r = runAssessment(withBase({ abutment: 'yes', ece: 'yes', broadContact: 'yes' }))
    expect(r.asTierKey).toBe('standard_as')
    expect(r.monitoringTier).toBe('intensive')
    expect(r.combinedTierKey).toBe('intensive_as')
  })

  it('maps each tier key to a color', () => {
    const colors = {
      standard_as: 'green', enhanced_as: 'yellow',
      intensive_as: 'amber', treatment_discussion: 'red',
    }
    expect(runAssessment(base).combinedColor).toBe(colors.standard_as)
    expect(runAssessment(withBase({ abutment: 'yes' })).combinedColor).toBe(colors.enhanced_as)
    expect(runAssessment(withBase({ psmaFinding: 'regional' })).combinedColor).toBe(colors.intensive_as)
    expect(runAssessment(withBase({
      abutment: 'yes', ece: 'yes', broadContact: 'yes', age: 40, germlineVariant: 'brca2',
    })).combinedColor).toBe(colors.treatment_discussion)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 2 INVARIANT — cohortContext must not alter the guideline tier
// ═══════════════════════════════════════════════════════════════════════════
describe('LAYER 2 invariant: cohort calibration never changes the guideline tier', () => {
  // Fields consumed ONLY by calcCohortContext / calcOutcomesPrediction.
  const cohortOnlyVariants = [
    {},
    { race: 'african_american' },
    { race: 'caucasian' },
    { race: 'other' },
    { race: 'BLACK' },
    { epsaPreBiopsyTier: 'low' },
    { epsaPreBiopsyTier: 'high' },
    { epsaPreBiopsyTier: 'intermediate-high' },
  ]

  const scenarios = [
    ['low risk', {}],
    ['enhanced', { abutment: 'yes' }],
    ['intensive', { psmaFinding: 'regional' }],
    ['treatment discussion', { abutment: 'yes', ece: 'yes', broadContact: 'yes', age: 40, germlineVariant: 'brca2' }],
    ['high PSAD', { prostateVolume: volForPsad(0.25) }],
    ['GG3', { ggg: 3 }],
  ]

  it.each(scenarios)('%s: tier and score are invariant to cohort-only fields', (_l, scenario) => {
    const ref = runAssessment(withBase(scenario))
    for (const variant of cohortOnlyVariants) {
      const r = runAssessment(withBase({ ...scenario, ...variant }))
      expect(r.combinedTierKey).toBe(ref.combinedTierKey)
      expect(r.asTierKey).toBe(ref.asTierKey)
      expect(r.monitoringTier).toBe(ref.monitoringTier)
      expect(r.featureCount).toBe(ref.featureCount)
      // epsaPreBiopsyTier adds a display-only 0-point factor
      expect(r.asScore).toBe(ref.asScore)
    }
  })

  it('epsaPreBiopsyTier contributes a 0-point factor only', () => {
    const r = runAssessment(withBase({ epsaPreBiopsyTier: 'high' }))
    const f = r.asFactors.find(x => x.label.startsWith('Pre-biopsy ePSA tier'))
    expect(f.points).toBe(0)
    expect(f.label).toBe('Pre-biopsy ePSA tier: High')
    expect(r.asScore).toBe(runAssessment(base).asScore)
  })

  it('race changes cohortContext content but not the tier', () => {
    const aa = runAssessment(withBase({ race: 'african_american' }))
    const cauc = runAssessment(withBase({ race: 'caucasian' }))
    const aaItem = aa.cohortContext.cohortItems.find(i => i.variable === 'race')
    const caucItem = cauc.cohortContext.cohortItems.find(i => i.variable === 'race')
    expect(aaItem.finding).not.toBe(caucItem.finding)
    expect(aa.combinedTierKey).toBe(cauc.combinedTierKey)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 2 — COHORT CONTEXT CONTENT
// ═══════════════════════════════════════════════════════════════════════════
describe('LAYER 2: cohort context', () => {
  it('always includes the overview and multivar composite items', () => {
    const vars = runAssessment(base).cohortContext.cohortItems.map(i => i.variable)
    expect(vars).toContain('cohort_overview')
    expect(vars).toContain('multivar_composite')
    expect(vars).toContain('tier_risk')
  })

  it.each([
    [0.0649, 'very_low'],
    [0.065, 'intermediate'],   // >= 0.065 is the intermediate tier here
    [0.1499, 'intermediate'],
    [0.15, 'nccn_zone'],
    [0.1769, 'nccn_zone'],
    [0.177, 'high'],
    [0.30, 'high'],
  ])('PSAD %f maps to the %s cohort tier', (psad, tierKey) => {
    const expected = COHORT_CALIBRATION.psad.tiers[tierKey]
    const item = runAssessment(withBase({ psa: 5, prostateVolume: volForPsad(psad) }))
      .cohortContext.cohortItems.find(i => i.variable === 'psad')
    expect(item.label).toContain(expected.label)
    expect(item.label).toContain(`${(expected.upgrade_rate * 100).toFixed(1)}%`)
  })

  // FIXED (defect 15): `chips.psad_tier_rate` used completely different
  // cut-points from the cohort item on the same screen — it branched on
  // `psad > youden_optimal (0.065)` and jumped straight to the HIGH tier's
  // 34.7%. Every PSAD in (0.065, 0.177] therefore produced a chip contradicting
  // the cohort item beside it. Both now resolve through `psadTierFor`.
  it('chips.psad_tier_rate agrees with the cohort PSAD tier at every boundary', () => {
    const cases = [
      [0.05,   0.112, '11.2%'],
      [0.07,   0.239, '23.9%'],   // was 34.7% on the chip, 23.9% in the item
      [0.14,   0.239, '23.9%'],
      [0.16,   0.273, '27.3%'],
      [0.20,   0.347, '34.7%'],
    ]
    for (const [psad, rate, pct] of cases) {
      const r = runAssessment(withBase({ psa: 5, prostateVolume: volForPsad(psad) }))
      expect(r.cohortContext.chips.psad_tier_rate).toBe(rate)
      expect(r.cohortContext.chips.psad_tier_label).toContain(pct)
      const item = r.cohortContext.cohortItems.find(i => i.variable === 'psad')
      expect(item.label).toContain(pct)
    }
  })

  // FIXED (defect 1): COHORT_CALIBRATION has no `fhx_prostate` key, so
  // `C.fhx_prostate.n_yes` threw a TypeError and familyHistory: 'yes' crashed
  // runAssessment outright — a live crash on a field the UI actually collects.
  // There is no family-history stratum in the N=1,213 extract, so rather than
  // fabricate a statistic the cohort item is omitted entirely.
  it('familyHistory is accepted without crashing and adds no fabricated cohort item', () => {
    expect(COHORT_CALIBRATION.fhx_prostate).toBeUndefined()
    for (const familyHistory of ['yes', 'no', null, undefined]) {
      const r = runAssessment(withBase({ familyHistory }))
      expect(r.hardStop).toBe(false)
      expect(r.cohortContext.cohortItems.some(i => i.variable === 'fhx')).toBe(false)
    }
    // family history is Layer 2 context only — it must not move the tier
    expect(runAssessment(withBase({ familyHistory: 'yes' })).combinedTierKey)
      .toBe(runAssessment(base).combinedTierKey)
    expect(runAssessment(withBase({ familyHistory: 'yes' })).asScore)
      .toBe(runAssessment(base).asScore)
  })

  it('reports PSAD as not calculable when prostate volume is absent', () => {
    const item = runAssessment({ ...base, prostateVolume: undefined })
      .cohortContext.cohortItems.find(i => i.variable === 'psad')
    expect(item.label).toBe('PSAD — Not Calculable')
  })

  it.each([
    [49, '< 50'], [50, '50–59'], [59, '50–59'], [60, '60–69'], [69, '60–69'], [70, '70+'], [95, '70+'],
  ])('age %i maps to the %s cohort tier', (age, label) => {
    const item = runAssessment(withBase({ age })).cohortContext.cohortItems.find(i => i.variable === 'age')
    expect(item.label).toContain(`(${label} tier)`)
  })

  it('tier_risk is only populated for tiers present in tier_annual_upgrade_risk', () => {
    const std = runAssessment(base).cohortContext.cohortItems.find(i => i.variable === 'tier_risk')
    expect(std.finding).toMatch(/~25%/)
    // intensive_as also has an entry
    const int = runAssessment(withBase({ psmaFinding: 'regional' }))
      .cohortContext.cohortItems.find(i => i.variable === 'tier_risk')
    expect(int.finding).toMatch(/~20%/)
    // FIXED (defect 7): tier_annual_upgrade_risk had no `treatment_discussion`
    // key, so the HIGHEST-risk patients were the only ones who received no
    // tier-level risk statement at all. They now get an item — but with
    // `risk: null`, because no cohort or literature rate exists for a tier
    // defined by feature accumulation rather than by a followed stratum. The
    // statement says so instead of inventing a figure.
    const tx = runAssessment(withBase({
      abutment: 'yes', ece: 'yes', broadContact: 'yes', age: 40, germlineVariant: 'brca2',
    })).cohortContext.cohortItems.find(i => i.variable === 'tier_risk')
    expect(tx).toBeDefined()
    expect(tx.finding).toMatch(/see clinical note/)
    expect(tx.finding).not.toMatch(/~\d+%/)   // no invented percentage
    expect(COHORT_CALIBRATION.tier_annual_upgrade_risk.treatment_discussion.risk).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// calcOutcomesPrediction
// ═══════════════════════════════════════════════════════════════════════════
describe('calcOutcomesPrediction', () => {
  it('uses the PSAD tier for GG1 patients', () => {
    const o = calcOutcomesPrediction(withBase({ prostateVolume: volForPsad(0.05) })).upgradeProbability
    expect(o.using_psad_tier).toBe(true)
    expect(o.by_psad_tier).toBeCloseTo(11.2, 5)
    expect(o.display_rate).toBeCloseTo(11.2, 5)
    expect(o.by_ggg).toBeCloseTo(26.7, 5)
  })

  it('falls back to the GGG rate for non-GG1 patients even when PSAD exists', () => {
    const o = calcOutcomesPrediction(withBase({ ggg: 2 })).upgradeProbability
    expect(o.using_psad_tier).toBe(false)
    expect(o.display_rate).toBeCloseTo(8.0, 5)
  })

  it.each([
    [0.0649, 11.2], [0.065, 23.9], [0.1499, 23.9], [0.15, 27.3], [0.1769, 27.3], [0.177, 34.7],
  ])('PSAD %f → tier rate %f%%', (psad, rate) => {
    const o = calcOutcomesPrediction(withBase({ prostateVolume: volForPsad(psad) })).upgradeProbability
    expect(o.by_psad_tier).toBeCloseTo(rate, 5)
  })

  it('flags age < 50 and age 50–59, but not 60+', () => {
    expect(calcOutcomesPrediction(withBase({ age: 49 })).upgradeProbability.ageFlag.n).toBe(50)
    expect(calcOutcomesPrediction(withBase({ age: 50 })).upgradeProbability.ageFlag.n).toBe(304)
    expect(calcOutcomesPrediction(withBase({ age: 60 })).upgradeProbability.ageFlag).toBeNull()
    expect(calcOutcomesPrediction(base).upgradeProbability.ageFlag).toBeNull()
  })

  it('flags African American race (both spellings)', () => {
    expect(calcOutcomesPrediction(withBase({ race: 'african_american' })).upgradeProbability.raceFlag.n).toBe(129)
    expect(calcOutcomesPrediction(withBase({ race: 'Black' })).upgradeProbability.raceFlag.n).toBe(129)
    expect(calcOutcomesPrediction(withBase({ race: 'caucasian' })).upgradeProbability.raceFlag).toBeNull()
  })

  it('marks unavailable data blocks explicitly', () => {
    const o = calcOutcomesPrediction(base)
    expect(o.adversePathology.available).toBe(false)
    expect(o.pendingData.timeToUpgrade.available).toBe(false)
    expect(o.biopsyBurden.yr5_expected).toBe(2)
  })

  it('returns null rates for a GGG with no cohort entry', () => {
    const o = calcOutcomesPrediction(withBase({ ggg: 5 })).upgradeProbability
    expect(o.by_ggg).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 3 — calcUpgradeRisk
// ═══════════════════════════════════════════════════════════════════════════
describe('LAYER 3: calcUpgradeRisk', () => {
  it('is unavailable without GGG or positive cores', () => {
    expect(calcUpgradeRisk({ positiveCores: 1 })).toEqual({ available: false, reason: 'GGG and positive core count required' })
    expect(calcUpgradeRisk({ ggg: 1 })).toEqual({ available: false, reason: 'GGG and positive core count required' })
    expect(calcUpgradeRisk({ ggg: 1, positiveCores: 'abc' }).available).toBe(false)
  })

  it('accepts totalPositiveCores as an alias', () => {
    expect(calcUpgradeRisk({ ggg: 1, totalPositiveCores: 1 }).probability)
      .toBe(calcUpgradeRisk({ ggg: 1, positiveCores: 1 }).probability)
  })

  it('always uses the fullModel (legacy branches are unreachable)', () => {
    const r = calcUpgradeRisk(base)
    expect(r.modelKey).toBe('fullModel')
    expect(r.auc).toBe(0.65)
    expect(r.modelN).toBe(1213)
    expect(r.hasCi).toBe(false)
    expect(r.ciLo).toBeNull()
    expect(r.cohortAvgPct).toBe(25)
  })

  it('reproduces the base-case probability exactly', () => {
    const r = calcUpgradeRisk(base)
    expect(r.probability).toBeCloseTo(0.23079990752, 9)
    expect(r.pct).toBe(23)
    expect(r.band).toBe('Average')
    expect(r.bandColor).toBe('yellow')
    expect(r.psadUsed).toBe(true)
  })

  it('applies the class-balance intercept correction', () => {
    expect(UPGRADE_RISK_MODEL.fullModel.intercept).toBeCloseTo(0.2011 - 1.0909, 10)
  })

  it.each([
    ['Very Low', 'green'], ['Low', 'green'], ['Average', 'yellow'],
    ['Elevated', 'orange'], ['High', 'red'],
  ].map(([band, color]) => [band, color]))('band %s has color %s', (band, color) => {
    // find a positiveCores value that lands in each band (coef +0.0565/core)
    const probe = (cores) => calcUpgradeRisk({ ...base, positiveCores: cores, totalCores: 60 })
    const found = [0, 5, 10, 15, 20, 25, 30, 40].map(probe).find(r => r.band === band)
    if (found) expect(found.bandColor).toBe(color)
    else expect(['Very Low', 'Low']).toContain(band) // unreachable low bands with these inputs
  })

  it('more positive cores monotonically increases risk', () => {
    const p = n => calcUpgradeRisk({ ...base, positiveCores: n, totalCores: 60 }).probability
    expect(p(1)).toBeLessThan(p(5))
    expect(p(5)).toBeLessThan(p(20))
  })

  it('GG2 lowers risk sharply vs GG1 (coef -1.5655 per ordinal step)', () => {
    expect(calcUpgradeRisk(withBase({ ggg: 2 })).probability)
      .toBeLessThan(calcUpgradeRisk(base).probability)
  })

  it('uses cohort-median fallbacks for absent optional inputs', () => {
    const bare = calcUpgradeRisk({ ggg: 1, positiveCores: 1 })
    expect(bare.available).toBe(true)
    expect(bare.psadUsed).toBe(false)
    expect(bare.inputs.psad).toBeNull()
  })

  it('pctBelow is clamped into 0–100', () => {
    for (const cores of [0, 1, 5, 20, 40]) {
      const r = calcUpgradeRisk({ ...base, positiveCores: cores, totalCores: 60 })
      expect(r.pctBelow).toBeGreaterThanOrEqual(0)
      expect(r.pctBelow).toBeLessThanOrEqual(100)
    }
  })

  // FIXED (defect 4): the full model read ECE and abutment ONLY from
  // `inputs.hasECE` / `inputs.hasAbutment` (booleans), but PatientForm.js emits
  // `ece: 'yes'` / `abutment: 'yes'` strings. Every assessment entered through
  // the form therefore encoded both as 0 and their fitted coefficients did
  // nothing. Both conventions are now accepted, defensively.
  it('ece/abutment reach the risk model in BOTH input conventions', () => {
    const ref = calcUpgradeRisk(base).probability
    const strForm  = calcUpgradeRisk(withBase({ ece: 'yes', abutment: 'yes' })).probability
    const boolForm = calcUpgradeRisk(withBase({ hasECE: true, hasAbutment: true })).probability
    expect(strForm).not.toBe(ref)
    expect(boolForm).not.toBe(ref)
    expect(strForm).toBe(boolForm)             // the two shapes agree exactly
    expect(strForm).toBeGreaterThan(ref)       // ECE/abutment coefficients are positive
    // explicit negatives and unrecognised values are NOT treated as positive
    expect(calcUpgradeRisk(withBase({ ece: 'no', abutment: 'no' })).probability).toBe(ref)
    expect(calcUpgradeRisk(withBase({ ece: 'unknown' })).probability).toBe(ref)
  })

  it('ece/abutment also raise monitoring features in both conventions', () => {
    expect(runAssessment(withBase({ ece: 'yes' })).featureCount).toBe(1)
    expect(runAssessment(withBase({ hasECE: true })).featureCount).toBe(1)
    expect(runAssessment(withBase({ hasAbutment: true })).featureCount).toBe(1)
    expect(runAssessment(withBase({ hasBroadContact: true })).featureCount).toBe(1)
    expect(runAssessment(withBase({ hasECE: false })).featureCount).toBe(0)
  })

  // FIXED (defect 5): race is now a documented, deliberate NON-input.
  //
  // This is a clinical-safety decision, not an unfinished feature. The national
  // VA data this project benchmarks against document race-based UNDER-offering
  // of active surveillance; a live race term would re-emit that disparity as an
  // individualised risk number and lend it the appearance of precision. The
  // fitted `race_category_2` coefficient is retained ONLY as the model's fixed
  // evaluation point (identical for every patient, a calibration constant), and
  // the misleading `const race = 1` variable is gone. Race remains visible as
  // observational cohort context, flagged riskAdjustmentUse: false.
  it('race NEVER affects the Layer 3 probability, by design', () => {
    const ref = calcUpgradeRisk(base).probability
    for (const race of ['african_american', 'caucasian', 'other', 'BLACK', 'white', '', null]) {
      expect(calcUpgradeRisk(withBase({ race })).probability).toBe(ref)
    }
    // …nor any tier, score or recommendation
    const refR = runAssessment(base)
    for (const race of ['african_american', 'caucasian', 'other']) {
      const r = runAssessment(withBase({ race }))
      expect(r.combinedTierKey).toBe(refR.combinedTierKey)
      expect(r.asScore).toBe(refR.asScore)
      expect(r.upgradeRisk.probability).toBe(refR.upgradeRisk.probability)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Malformed / hostile inputs
// ═══════════════════════════════════════════════════════════════════════════
describe('malformed and edge-case inputs', () => {
  it('accepts numeric strings for the core numeric fields', () => {
    const r = runAssessment({ ggg: '1', positiveCores: '1', totalCores: '12', maxCorePercent: '20', psa: '5', prostateVolume: '50', pirads: '2' })
    expect(r.combinedTierKey).toBe('standard_as')
    expect(r.psad).toBeCloseTo(0.1, 10)
  })

  it('treats prostateVolume "" as absent (PSAD not computed)', () => {
    // '' coerces to 0 in Number('') so the >0 guard sends it to the PSA fallback
    const r = runAssessment(withBase({ prostateVolume: '' }))
    expect(r.psad).toBeNull()
    expect(r.asFactors.some(f => f.label.includes('PSAD unavailable'))).toBe(true)
  })

  it('rejects a non-numeric GGG string', () => {
    expect(() => runAssessment(withBase({ ggg: 'high' }))).toThrow(/Invalid inputs/)
  })

  // FIXED (defect 2 — the NaN hole): range guards written as bare comparisons
  // (`<= 0`, `> 100`) are blind to NaN, because every comparison against NaN is
  // false. A garbage PSA string therefore passed validation, PSAD became NaN,
  // and — since each rung of the PSAD ladder also compared false — the score
  // fell through to the MOST FAVOURABLE else-branch: -5 points, "very low risk
  // tier", standard_as. A typo produced a reassuring answer indistinguishable
  // from a genuinely low-risk patient. Every numeric field is now gated on
  // Number.isFinite before any range check.
  it('NaN-producing strings are rejected outright, never treated as favourable', () => {
    for (const [field, value] of [
      ['psa', 'abc'], ['maxCorePercent', 'lots'], ['prostateVolume', 'big'],
      ['age', 'old'], ['decipher', 'x'], ['gps', 'y'], ['prolaris', 'z'],
      ['psaVelocity', 'fast'], ['psaDoublingTime', 'soon'], ['pirads', 'high'],
    ]) {
      const errs = validateInputs(withBase({ [field]: value }))
      expect(errs[field]).toMatch(/must be a number/i)
      expect(() => runAssessment(withBase({ [field]: value }))).toThrow(/Invalid inputs/)
    }
  })

  it('a garbage PSA no longer yields the same answer as a genuinely low-risk patient', () => {
    // This was the concrete failure: psa 'abc' produced asScore -8 / standard_as,
    // byte-identical to the lowest-risk case. It is now refused.
    expect(() => runAssessment(withBase({ psa: 'abc' }))).toThrow(/Invalid inputs/)
  })

  it('blank optional numerics are still treated as absent, not as errors', () => {
    // The finite-check must not turn "not provided" into "invalid".
    expect(validateInputs(withBase({
      prostateVolume: '', decipher: '', gps: '', prolaris: '',
      age: '', psaVelocity: '', psaDoublingTime: '',
    }))).toEqual({})
    expect(validateInputs(withBase({ prostateVolume: null, age: undefined }))).toEqual({})
  })

  it('extreme-but-valid inputs do not throw', () => {
    expect(() => runAssessment({
      ggg: 3, positiveCores: 0, totalCores: 1, maxCorePercent: 100,
      psa: 100, prostateVolume: 500, pirads: 5, age: 18,
      decipher: 1, gps: 100, prolaris: 10, psaVelocity: 0, psaDoublingTime: 0,
    })).not.toThrow()
  })

  it('unknown enum values are ignored rather than throwing', () => {
    const r = runAssessment(withBase({
      abutment: 'maybe', ece: 'unknown', broadContact: 'n/a',
      germlineVariant: 'atm', confirmMDx: 'equivocal',
    }))
    expect(r.featureCount).toBe(0)
    // FIXED (defect 8): `confirmMDx === 'positive' ? 10 : -8` scored EVERY
    // unrecognised value — 'equivocal', a typo, a future enum member — as a
    // reassuring NEGATIVE result worth -8 points. An unknown result is not a
    // negative result. Only {positive, negative} are scored; anything else is
    // "not assessed" and contributes nothing.
    expect(r.genomicAssessed).toBe(false)
    expect(r.genomicScore).toBeNull()
  })

  it('only explicitly recognised ConfirmMDx values are scored', () => {
    expect(runAssessment(withBase({ confirmMDx: 'positive' })).genomicScore).toBe(10)
    expect(runAssessment(withBase({ confirmMDx: 'negative' })).genomicScore).toBe(-8)
    for (const v of ['equivocal', 'not_done', 'NEGATIVE', 'pending', '']) {
      const r = runAssessment(withBase({ confirmMDx: v }))
      expect(r.genomicAssessed).toBe(false)
      expect(r.genomicScore).toBeNull()
      expect(r.asScore).toBe(runAssessment(base).asScore)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Exported constant integrity
// ═══════════════════════════════════════════════════════════════════════════
describe('exported constants', () => {
  it('cohort N and upgrade counts are consistent', () => {
    const o = COHORT_CALIBRATION.overview
    expect(o.n).toBe(1213)
    expect(o.upgrade_events).toBe(305)
    expect(o.overall_upgrade_rate).toBeCloseTo(305 / 1213, 3)
    expect(COHORT_CALIBRATION.intervention.currently_in_as + COHORT_CALIBRATION.intervention.progressed_total).toBe(o.n)
  })

  it('PSAD tier Ns sum to the GG1 PSAD subset', () => {
    const t = COHORT_CALIBRATION.psad.tiers
    expect(t.very_low.n + t.intermediate.n + t.nccn_zone.n + t.high.n).toBe(COHORT_CALIBRATION.psad.n)
  })

  // FIXED (defect 6): COHORT_CALIBRATION.age declared `n: 1213` (the full
  // cohort) while its four tier Ns sum to 1,111 — the GG1 subset size — and the
  // UI copy repeated the wrong denominator as "In our N=1213 cohort". The
  // stratification was computed on GG1 only; the declared N and the copy now
  // say so, and the tier Ns reconcile against it.
  it('age tier Ns sum to the declared denominator, which is the GG1 subset', () => {
    const t = COHORT_CALIBRATION.age.tiers
    expect(COHORT_CALIBRATION.age.n).toBe(1111)
    expect(COHORT_CALIBRATION.age.ggg_subset).toBe(1)
    expect(COHORT_CALIBRATION.age.cohort_n).toBe(1213)
    expect(t.under_50.n + t.age_50_59.n + t.age_60_69.n + t.age_70p.n)
      .toBe(COHORT_CALIBRATION.age.n)
    // …and the GG1 subset N matches by_ggg[1]
    expect(COHORT_CALIBRATION.age.n).toBe(COHORT_CALIBRATION.by_ggg[1].n)

    const finding = runAssessment(withBase({ age: 65 })).cohortContext.cohortItems
      .find(i => i.variable === 'age').finding
    expect(finding).toMatch(/GG1 subset \(N=1111 of the N=1213 cohort\)/)
    expect(finding).not.toMatch(/N=1213 cohort, patients aged/)
  })

  it('race Ns sum to the full cohort', () => {
    const r = COHORT_CALIBRATION.race
    expect(r.caucasian.n + r.other.n + r.african_american.n).toBe(1213)
  })

  // SUSPECT: COHORT_CALIBRATION.by_ggg Ns (1111 + 100 + 2 = 1213) are fine, but
  // MODEL_VALIDATION.composite is computed on N=218 while every cohort-context
  // statement cites N=1,213 — the two are different denominators surfaced in the
  // same UI. Asserting the numbers as they stand.
  it('by_ggg Ns sum to the full cohort', () => {
    const g = COHORT_CALIBRATION.by_ggg
    expect(g[1].n + g[2].n + g[3].n).toBe(1213)
  })

  it('composite tier distribution sums to N=218', () => {
    const d = MODEL_VALIDATION.composite.tier_distribution
    expect(d.standard.n + d.enhanced.n + d.intensive.n + d.treatment.n).toBe(MODEL_VALIDATION.composite.n)
  })
})
