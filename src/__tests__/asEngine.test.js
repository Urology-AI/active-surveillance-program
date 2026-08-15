/**
 * Golden-case regression suite for asEngine.js
 *
 * These tests assert the engine's ACTUAL CURRENT behavior, discovered by reading
 * the source. They are a regression net, not a restatement of clinical intent.
 * Anything that looked wrong while reading is marked `// SUSPECT:` and asserted
 * as-is rather than "fixed".
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
// score: GG1 0 + cores(<3) 0 + maxCore 0 + PSAD 0.100 (-5) + PI-RADS 2 (-3) = -8
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
  it('lowest-risk case is standard_as with score -8', () => {
    const r = runAssessment(base)
    expect(r.hardStop).toBe(false)
    expect(r.asScore).toBe(-8)
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
    // GG3 = 22 pts, so -8 + 22 = 14
    expect(r.asScore).toBe(14)
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

  // SUSPECT: src/asEngine.js:1635 — the hard-stop return still calls
  // calcUpgradeRisk(inputs), and calcUpgradeRisk encodes GGG via
  // UPGRADE_RISK_MODEL.fullModel.enc.ggg which only maps {1,2,3}. GG4/GG5 fall
  // through `?? 0` (src/asEngine.js:1457) and are scored as if they were GG1,
  // so a metastatic/GG5 patient is shown the same upgrade probability as a GG1
  // patient. Asserting current behavior.
  it('SUSPECT: hard-stop cases still get a GG1-equivalent upgradeRisk', () => {
    const gg1 = calcUpgradeRisk(base).probability
    expect(calcUpgradeRisk(withBase({ ggg: 4 })).probability).toBe(gg1)
    expect(calcUpgradeRisk(withBase({ ggg: 5 })).probability).toBe(gg1)
    expect(runAssessment(withBase({ ggg: 5 })).upgradeRisk.probability).toBe(gg1)
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
    expect(scoreOf({ ggg })).toBe(-8 + pts)
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
    ['9/24 — ratio 37.5% (>0.33)', 9, 24, 3, 'intermediate'],
    ['8/24 — ratio 33.3% (JS 0.3333 > 0.33)', 8, 24, 3, 'intermediate'],
    ['12/24 — ratio exactly 0.50', 12, 24, 3, 'intermediate'],
    ['13/24 — ratio 54% (>0.50)', 13, 24, 6, 'high'],
  ])('%s', (_l, positiveCores, totalCores, pts, tier) => {
    const f = runAssessment(withBase({ positiveCores, totalCores })).asFactors[1]
    expect(f.points).toBe(pts)
    expect(f.tier).toBe(tier)
  })

  // SUSPECT: src/asEngine.js:526-528 — the ratio buckets compare against the
  // literal 0.33, not 1/3. 8/24 = 0.33333… lands in the >0.33 'intermediate'
  // bucket while a true "one third" cutoff would not, so a clinically identical
  // one-third burden scores 3 pts or 1 pt depending on how the fraction rounds
  // (e.g. 4/12 = 0.3333 → 3 pts, but 1/3 expressed as 33 of 100 cores → 1 pt).
  it('SUSPECT: ratio bucket uses literal 0.33, so one-third burdens straddle the cutoff', () => {
    expect(runAssessment(withBase({ positiveCores: 4, totalCores: 12 })).asFactors[1].points).toBe(3)
    expect(runAssessment(withBase({ positiveCores: 33, totalCores: 100 })).asFactors[1].points).toBe(1)
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
    [0.065,  -5, 'low'],   // exactly at Youden cutoff — no scoring change
    [0.0651, -5, 'low'],
    [0.0999, -5, 'low'],
    [0.10,   -5, 'low'],   // exactly at 0.10 — still -5 (strict >)
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

  // SUSPECT: src/asEngine.js:565-580 — the PSAD scoring bands and the `basis`
  // narrative use DIFFERENT cut-points. Scoring gives the maximally favourable
  // -5 bucket to anything <= 0.10, while the narrative branches at 0.065. A
  // patient with PSAD 0.08–0.10 therefore receives the "very low risk" -5 score
  // while being told they sit in the 0.065–0.15 tier with a 23.9% upgrade rate.
  // The engine's own Youden cutoff is 0.065, not 0.10; 0.10 appears nowhere in
  // COHORT_CALIBRATION.psad.
  it('SUSPECT: PSAD 0.08–0.10 gets the "very low" -5 score but 23.9%-tier narrative', () => {
    for (const psad of [0.08, 0.0999, 0.10]) {
      const f = psadFactor(psad)
      expect(f.points).toBe(-5)
      expect(f.basis).toMatch(/PSAD 0\.065–0\.15 — intermediate risk tier/)
      const item = runAssessment(withBase({ psa: 5, prostateVolume: volForPsad(psad) }))
        .cohortContext.cohortItems.find(i => i.variable === 'psad')
      expect(item.label).toMatch(/0\.065–0\.15/)
    }
    // …while a genuinely-sub-0.065 patient gets the identical -5 score
    expect(psadFactor(0.05).points).toBe(-5)
    expect(psadFactor(0.05).basis).toMatch(/PSAD < 0\.065/)
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
    expect(r.asScore).toBe(-5) // -8 minus the PI-RADS 2 (-3) contribution
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
    // GG3(22) + PI-RADS 1(-5) + PSAD 0.16(5) + maxCore 51(4) + cores 13/24(6) = 32
    // Simpler: GG3(22) + PI-RADS 2(-3) + PSAD 0.10(-5) + cores 0 = 14 (enhanced)
    expect(scoreOf({ ggg: 3 })).toBe(14)
    expect(runAssessment(withBase({ ggg: 3 })).asTierKey).toBe('enhanced_as')
    // push to exactly 20: GG3(22) + PI-RADS 3(0) + PSAD 0.10(-5) + maxCore 51(4) = 21
    const at21 = runAssessment(withBase({ ggg: 3, pirads: 3, maxCorePercent: 51 }))
    expect(at21.asScore).toBe(21)
    expect(at21.asTierKey).toBe('intensive_as')
    // exactly 20: GG3(22) + PI-RADS 2(-3) + PSAD 0.15(0) + maxCore 51(4) + cores 0 = 23
    // use PI-RADS 3(0) + PSAD 0.10(-5) + cores 3/24(1) = 18 → enhanced
    const at18 = runAssessment(withBase({ ggg: 3, pirads: 3, positiveCores: 3, totalCores: 24 }))
    expect(at18.asScore).toBe(18)
    expect(at18.asTierKey).toBe('enhanced_as')
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

  // SUSPECT: src/asEngine.js:771-798 — psmaScore is computed and returned but is
  // never added to any score used for tier assignment. calcCombined only reads
  // psmaFinding === 'regional' / hardOverride, so PSMA "negative" (-15 pts) and
  // "local" (0 pts) have zero effect on the tier via scoring. "local" only
  // matters because calcMonitoring counts it as a feature.
  it('SUSPECT: psmaScore never feeds the composite score', () => {
    expect(runAssessment(withBase({ psmaFinding: 'negative' })).asScore).toBe(scoreOf())
    expect(runAssessment(withBase({ psmaFinding: 'negative' })).combinedTierKey).toBe('standard_as')
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

  // SUSPECT: src/asEngine.js:1188-1200 — the `chips.psad_tier_rate` helper uses
  // completely different cut-points from the cohort item above: it branches on
  // `psad > youden_optimal (0.065)` → HIGH tier rate (34.7%). So PSAD 0.07 gets
  // a "34.7% upgrade rate" chip while the cohort item correctly says 23.9%.
  // The chip is wrong for every PSAD in (0.065, 0.177].
  it('SUSPECT: chips.psad_tier_rate disagrees with the cohort PSAD tier', () => {
    const r = runAssessment(withBase({ psa: 7, prostateVolume: 100 })) // PSAD 0.07
    expect(r.cohortContext.chips.psad_tier_rate).toBe(0.347)
    const item = r.cohortContext.cohortItems.find(i => i.variable === 'psad')
    expect(item.label).toContain('23.9%')
  })

  // SUSPECT: src/asEngine.js:1080-1088 — COHORT_CALIBRATION has no
  // `fhx_prostate` key, so `const fhx = C.fhx_prostate` is undefined and
  // reading `fhx.n_yes` throws a TypeError. Passing familyHistory: 'yes'
  // crashes runAssessment outright. This is a live crash, not a mis-scoring.
  it('SUSPECT: familyHistory "yes" throws a TypeError (missing COHORT_CALIBRATION.fhx_prostate)', () => {
    expect(COHORT_CALIBRATION.fhx_prostate).toBeUndefined()
    expect(() => runAssessment(withBase({ familyHistory: 'yes' })))
      .toThrow(/Cannot read properties of undefined \(reading 'n_yes'\)/)
    // 'no' happens to be safe because the inner branch is never entered
    expect(() => runAssessment(withBase({ familyHistory: 'no' }))).not.toThrow()
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
    // SUSPECT: src/asEngine.js:115-119 — tier_annual_upgrade_risk has no
    // `treatment_discussion` key, so the highest-risk patients get NO
    // tier-level risk statement at all.
    const tx = runAssessment(withBase({
      abutment: 'yes', ece: 'yes', broadContact: 'yes', age: 40, germlineVariant: 'brca2',
    })).cohortContext.cohortItems.find(i => i.variable === 'tier_risk')
    expect(tx).toBeUndefined()
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

  // SUSPECT: src/asEngine.js:1460-1461 — the full model reads ECE and abutment
  // from `inputs.hasECE` / `inputs.hasAbutment` (booleans), but every other part
  // of the engine and the UI uses `inputs.ece === 'yes'` / `inputs.abutment ===
  // 'yes'`. As wired, ECE and abutment ALWAYS encode as 0 in the risk model.
  it('SUSPECT: ece/abutment inputs are ignored by calcUpgradeRisk (expects hasECE/hasAbutment)', () => {
    const ref = calcUpgradeRisk(base).probability
    expect(calcUpgradeRisk(withBase({ ece: 'yes', abutment: 'yes' })).probability).toBe(ref)
    expect(calcUpgradeRisk(withBase({ hasECE: true, hasAbutment: true })).probability).not.toBe(ref)
  })

  // SUSPECT: src/asEngine.js:1464 — race is hard-coded to 1 (Caucasian) and the
  // smoking/comorbidity/family-history features are hard-coded to 0, so
  // `inputs.race` has no effect on the Layer 3 probability even though race is
  // collected and displayed elsewhere.
  it('SUSPECT: inputs.race does not affect calcUpgradeRisk', () => {
    expect(calcUpgradeRisk(withBase({ race: 'african_american' })).probability)
      .toBe(calcUpgradeRisk(base).probability)
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

  // SUSPECT: src/asEngine.js:405-410 — the PSA guard is `Number(psa) <= 0` /
  // `> 100`. NaN fails BOTH comparisons, so a garbage PSA string such as 'abc'
  // passes validation, PSAD becomes NaN, and the PSAD factor renders as
  // "PSA Density NaN". The same NaN hole exists for maxCorePercent,
  // prostateVolume, decipher, gps, prolaris, age, psaVelocity and
  // psaDoublingTime — every field validated with numeric range comparisons
  // rather than an explicit isNaN check.
  it('SUSPECT: NaN-producing strings pass validation and propagate as NaN', () => {
    expect(validateInputs(withBase({ psa: 'abc' })).psa).toBeUndefined()
    const r = runAssessment(withBase({ psa: 'abc' }))
    expect(Number.isNaN(r.psad)).toBe(true)
    expect(r.asFactors.some(f => f.label === 'PSA Density NaN ng/mL/cm³')).toBe(true)
    // …and because every NaN comparison is false, the PSAD ladder falls through
    // to its most-favourable else-branch: -5 points and "very low risk tier".
    const f = r.asFactors.find(x => x.label.startsWith('PSA Density'))
    expect(f.points).toBe(-5)
    expect(f.basis).toMatch(/very low risk tier/)
    expect(r.combinedTierKey).toBe('standard_as')
    expect(validateInputs(withBase({ maxCorePercent: 'lots' })).maxCorePercent).toBeUndefined()
    expect(validateInputs(withBase({ age: 'old' })).age).toBeUndefined()
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
    // confirmMDx anything other than 'not_done'/null counts as assessed and
    // is scored as if NEGATIVE (-8) by the `=== 'positive' ? 10 : -8` ternary.
    // SUSPECT: src/asEngine.js:741 — an unrecognised ConfirmMDx value silently
    // scores as a favourable negative result.
    expect(r.genomicAssessed).toBe(true)
    expect(r.genomicScore).toBe(-8)
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

  // SUSPECT: src/asEngine.js:91-99 — COHORT_CALIBRATION.age declares `n: 1213`
  // and the UI string built at src/asEngine.js:1070 says "In our N=1,213
  // cohort", but the four age tier Ns sum to 1,111 (= the GG1 subset size), not
  // 1,213. Either 102 patients are missing from the age breakdown or the age
  // stratification was computed on GG1 only and is being labelled as full-cohort.
  it('SUSPECT: age tier Ns sum to 1,111, not the declared N=1,213', () => {
    const t = COHORT_CALIBRATION.age.tiers
    expect(COHORT_CALIBRATION.age.n).toBe(1213)
    expect(t.under_50.n + t.age_50_59.n + t.age_60_69.n + t.age_70p.n).toBe(1111)
    expect(runAssessment(withBase({ age: 65 })).cohortContext.cohortItems
      .find(i => i.variable === 'age').finding).toMatch(/N=1213 cohort/)
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
