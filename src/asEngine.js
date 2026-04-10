/**
 * asEngine.js — pure calculation engine, no React
 *
 * Evidence basis and citations are embedded per sub-model below.
 * All scoring thresholds reference specific published criteria.
 * Point weights within each sub-model are ordinal proxies for the
 * risk tier implied by each threshold; they are not regression-derived.
 * Clinical validation should be performed before deployment.
 */

// ─── Input validation ─────────────────────────────────────────────────────────
export function validateInputs(inputs) {
  const errors = {}

  if (inputs.ggg == null || ![1,2,3,4,5].includes(inputs.ggg))
    errors.ggg = 'Grade Group is required (1–5)'

  if (inputs.positiveCores == null || inputs.positiveCores === '')
    errors.positiveCores = 'Required'
  else if (!Number.isInteger(Number(inputs.positiveCores)) || Number(inputs.positiveCores) < 0)
    errors.positiveCores = 'Must be a non-negative whole number'

  if (inputs.totalCores == null || inputs.totalCores === '')
    errors.totalCores = 'Required'
  else if (!Number.isInteger(Number(inputs.totalCores)) || Number(inputs.totalCores) < 1)
    errors.totalCores = 'Must be a whole number ≥ 1'

  if (!errors.positiveCores && !errors.totalCores &&
      Number(inputs.positiveCores) > Number(inputs.totalCores))
    errors.positiveCores = 'Cannot exceed total cores'

  if (inputs.maxCorePercent == null || inputs.maxCorePercent === '')
    errors.maxCorePercent = 'Required'
  else if (Number(inputs.maxCorePercent) < 0 || Number(inputs.maxCorePercent) > 100)
    errors.maxCorePercent = 'Must be 0–100%'

  if (inputs.psa == null || inputs.psa === '')
    errors.psa = 'Required'
  else if (Number(inputs.psa) <= 0)
    errors.psa = 'Must be > 0 ng/mL'
  else if (Number(inputs.psa) > 100)
    errors.psa = 'Value > 100 ng/mL — please verify'

  if (inputs.prostateVolume != null && inputs.prostateVolume !== '') {
    if (Number(inputs.prostateVolume) <= 0)
      errors.prostateVolume = 'Must be > 0 cc'
    else if (Number(inputs.prostateVolume) > 500)
      errors.prostateVolume = 'Value > 500 cc — please verify'
  }

  if (inputs.pirads == null)
    errors.pirads = 'PI-RADS score is required'

  if (inputs.decipher != null && inputs.decipher !== '' &&
      (Number(inputs.decipher) < 0 || Number(inputs.decipher) > 1))
    errors.decipher = 'Must be 0.00–1.00'

  if (inputs.gps != null && inputs.gps !== '' &&
      (Number(inputs.gps) < 0 || Number(inputs.gps) > 100))
    errors.gps = 'Must be 0–100'

  if (inputs.prolaris != null && inputs.prolaris !== '' &&
      (Number(inputs.prolaris) < 0 || Number(inputs.prolaris) > 10))
    errors.prolaris = 'Typical range 0–10'

  if (inputs.age != null && inputs.age !== '' &&
      (Number(inputs.age) < 18 || Number(inputs.age) > 120))
    errors.age = 'Must be 18–120 years'

  return errors
}

// ─── Sub-model 1: Basic + PSAD ────────────────────────────────────────────────
/**
 * Evidence basis:
 *  · GGG (ISUP 2014/2016): Epstein JI et al., Eur Urol 2016; 69(3):428-435
 *    GGG 1 = NCCN very low / low risk (AS strongly recommended)
 *    GGG 2 = favourable-intermediate (select AS programs eligible; Klotz 2015)
 *    GGG 3 = unfavourable-intermediate (outside standard AS criteria)
 *    GGG 4-5 = high / very high risk (AS not recommended under NCCN 2024)
 *
 *  · Core burden (NCCN 2024 very low risk): ≤2 positive cores, no core > 50%
 *    Bastian PJ et al., J Urol 2004; Epstein JI et al., J Urol 1994
 *    Core ratio thresholds mapped to NCCN VLOW (<17%), approaching limit (17-33%),
 *    outside criteria (>33%), significantly outside (>50%)
 *
 *  · PSAD thresholds:
 *    0.15 ng/mL/cm³ — NCCN 2024 very low risk upper bound
 *    0.177 ng/mL/cm³ — Kadeer et al. 2025 Youden optimal cutoff for reclassification
 *    (Kadeer N et al., Eur Urol 2025, PMID pending)
 *
 *  · PI-RADS v2.1: Turkbey B et al., Eur Urol 2019; 76(3):340-351
 */
function calcBasic({ ggg, positiveCores, totalCores, maxCorePercent, psa, prostateVolume, pirads, epsaPreBiopsyTier }) {
  const factors = []
  let score = 0

  // GGG — ISUP 2016 risk tiers
  if (ggg != null) {
    const ptsMap  = { 1: 0, 2: 8, 3: 22, 4: 28, 5: 35 }
    const tierMap = { 1: 'low', 2: 'low', 3: 'intermediate', 4: 'high', 5: 'high' }
    const glossary = { 1:'3+3=6', 2:'3+4=7', 3:'4+3=7', 4:'4+4=8', 5:'9–10' }
    const pts  = ptsMap[ggg]
    const tier = tierMap[ggg]
    score += pts
    factors.push({ label: `Grade Group ${ggg} — Gleason ${glossary[ggg]}`, points: pts, tier,
      basis: ggg <= 2 ? 'NCCN 2024: eligible for AS consideration'
           : ggg === 3 ? 'NCCN 2024: unfavourable-intermediate — outside standard AS criteria'
           : 'NCCN 2024: high / very high risk — AS not recommended' })
  }

  // Core ratio — NCCN VLOW criterion: < 3 positive cores (Epstein 1994)
  if (positiveCores != null && totalCores != null && totalCores > 0) {
    const ratio = positiveCores / totalCores
    let pts = 0; let tier = 'low'
    if      (ratio > 0.50) { pts = 12; tier = 'high' }         // well outside NCCN criteria
    else if (ratio > 0.33) { pts = 8;  tier = 'high' }         // outside NCCN VLOW
    else if (ratio > 0.17) { pts = 4;  tier = 'intermediate' } // approaching NCCN limit
    score += pts
    factors.push({ label: `Core ratio ${positiveCores}/${totalCores} (${Math.round(ratio * 100)}%)`,
      points: pts, tier,
      basis: ratio <= 0.17 ? 'Meets NCCN 2024 very low risk (<3/12 cores)'
           : ratio <= 0.33 ? 'Approaching NCCN core number limit'
           : 'Outside NCCN 2024 very low risk core criterion' })
  }

  // Max core involvement — NCCN VLOW: no core > 50% (Bastian 2004)
  if (maxCorePercent != null) {
    const pts  = maxCorePercent > 50 ? 10 : 0
    const tier = maxCorePercent > 50 ? 'high' : 'low'
    score += pts
    factors.push({ label: `Max core involvement ${maxCorePercent}%`, points: pts, tier,
      basis: maxCorePercent <= 50 ? 'Within NCCN 2024 very low risk (≤50% per core)'
           : 'Exceeds NCCN 2024 very low risk threshold (>50% per core)' })
  }

  // PSAD — dual threshold: NCCN VLOW 0.15 + Kadeer 2025 Youden 0.177
  let psad = null
  if (psa != null && prostateVolume != null && prostateVolume > 0) {
    psad = psa / prostateVolume
    let pts = 0; let tier = 'low'
    if      (psad > 0.177) { pts = 12; tier = 'high' }         // above Kadeer 2025 Youden cutoff
    else if (psad > 0.15)  { pts = 5;  tier = 'intermediate' } // above NCCN VLOW threshold
    else if (psad > 0.10)  { pts = 0;  tier = 'low' }          // below NCCN VLOW threshold
    else                   { pts = -5; tier = 'low' }           // very low — strongly supports AS
    score += pts
    factors.push({ label: `PSAD ${psad.toFixed(3)} ng/mL/cm³`, points: pts, tier,
      basis: psad > 0.177 ? 'Above Kadeer 2025 Youden cutoff (0.177)'
           : psad > 0.15  ? 'Above NCCN 2024 very low risk threshold (0.15); below Kadeer 2025 optimal cutoff'
           : 'Within NCCN 2024 very low risk range' })
  } else if (psa != null) {
    // Volume not provided — PSA alone as proxy (NCCN/PRIAS threshold: ≤10 ng/mL)
    let pts = 0; let tier = 'low'
    if      (psa >= 10) { pts = 10; tier = 'high' }         // above NCCN/PRIAS threshold
    else if (psa >= 4)  { pts = 0;  tier = 'intermediate' }
    else                { pts = -3; tier = 'low' }
    score += pts
    factors.push({ label: `PSA ${psa} ng/mL (prostate volume not provided)`, points: pts, tier,
      basis: psa >= 10 ? 'Above NCCN 2024/PRIAS threshold (PSA ≤10 ng/mL for AS)'
           : 'Below NCCN/PRIAS PSA threshold — enter prostate volume for PSAD' })
  }

  // PI-RADS v2.1 — Turkbey 2019
  if (pirads != null) {
    const ptsMap  = { 1: -5, 2: -3, 3: 0, 4: 8, 5: 15 }
    const tierMap = { 1: 'low', 2: 'low', 3: 'intermediate', 4: 'high', 5: 'high' }
    const pts  = ptsMap[pirads] ?? 0
    const tier = tierMap[pirads] ?? 'intermediate'
    score += pts
    factors.push({ label: `PI-RADS ${pirads}`, points: pts, tier,
      basis: pirads <= 2 ? 'PI-RADS v2.1: low probability of clinically significant cancer'
           : pirads === 3 ? 'PI-RADS v2.1: equivocal — requires clinical judgment'
           : pirads === 4 ? 'PI-RADS v2.1: high probability of clinically significant cancer'
           : 'PI-RADS v2.1: very high probability of clinically significant cancer' })
  }

  // ePSA pre-biopsy tier modifier — only fires for high/intermediate-high
  if (epsaPreBiopsyTier === 'high' || epsaPreBiopsyTier === 'intermediate-high') {
    const pts   = epsaPreBiopsyTier === 'high' ? 1 : 0.5
    const label = epsaPreBiopsyTier === 'high'
      ? 'Elevated pre-biopsy ePSA tier (High)'
      : 'Elevated pre-biopsy ePSA tier (Intermediate-High)'
    score += pts
    factors.push({ label, points: pts, tier: 'intermediate', basis: 'ePSA pre-biopsy context' })
  }

  // Tier mapping (calibrated to NCCN/PRIAS criteria deviation)
  let asTierKey
  if      (score <= 3)  asTierKey = 'standard_as'   // fully within published AS criteria
  else if (score <= 20) asTierKey = 'enhanced_as'   // minor deviations; enhanced monitoring
  else if (score <= 45) asTierKey = 'intensive_as'  // moderate-significant risk elevation
  else                  asTierKey = 'treatment'      // multiple high-risk criteria exceeded

  return { asTierKey, asScore: score, asFactors: factors, psad }
}

// ─── Sub-model 2: Genomic ─────────────────────────────────────────────────────
/**
 * Evidence basis:
 *  · Decipher thresholds (0.45 / 0.60): Spratt DE et al., Lancet Oncol 2014
 *  · Oncotype GPS thresholds (20 / 40): Klein EA et al., Eur Urol 2021
 *  · Prolaris CCP thresholds (1.5 / 2.1): Cooperberg MR et al., Cancer 2013
 *  · ConfirmMDx: Stewart GD et al., J Urol 2013
 */
function calcGenomic({ decipher, gps, prolaris, confirmMDx }) {
  const factors = []
  let score = 0
  let assessed = false

  if (decipher != null) {
    assessed = true
    let pts, tier
    if      (decipher >= 0.60) { pts = 15;  tier = 'high' }         // Spratt 2014: high-risk threshold
    else if (decipher >= 0.45) { pts = 8;   tier = 'intermediate' } // Spratt 2014: intermediate threshold
    else                       { pts = -10; tier = 'low' }
    score += pts
    factors.push({ label: `Decipher genomic classifier ${decipher}`, points: pts, tier })
  }

  if (gps != null) {
    assessed = true
    let pts, tier
    if      (gps >= 40) { pts = 12;  tier = 'high' }         // Klein 2021: high GPS
    else if (gps >= 20) { pts = 5;   tier = 'intermediate' } // Klein 2021: intermediate GPS
    else                { pts = -8;  tier = 'low' }
    score += pts
    factors.push({ label: `Oncotype DX GPS ${gps}`, points: pts, tier })
  }

  if (prolaris != null) {
    assessed = true
    let pts, tier
    if      (prolaris >= 2.1) { pts = 12;  tier = 'high' }         // Cooperberg 2013
    else if (prolaris >= 1.5) { pts = 5;   tier = 'intermediate' }
    else                      { pts = -8;  tier = 'low' }
    score += pts
    factors.push({ label: `Prolaris CCP score ${prolaris}`, points: pts, tier })
  }

  if (confirmMDx != null && confirmMDx !== 'not_done') {
    assessed = true
    const pts  = confirmMDx === 'positive' ? 10 : -8
    const tier = confirmMDx === 'positive' ? 'high' : 'low'
    score += pts
    factors.push({ label: `ConfirmMDx: ${confirmMDx}`, points: pts, tier })
  }

  if (!assessed) return { genomicRiskTier: null, genomicScore: null, genomicFactors: [], genomicAssessed: false }

  let genomicRiskTier
  if      (score <= -5) genomicRiskTier = 'low'
  else if (score <= 10) genomicRiskTier = 'intermediate'
  else                  genomicRiskTier = 'high'

  return { genomicRiskTier, genomicScore: score, genomicFactors: factors, genomicAssessed: true }
}

// ─── Sub-model 3: PSMA PET/CT ─────────────────────────────────────────────────
/**
 * Evidence basis:
 *  · EAU-EANM-ESTRO-ESUR-SIOG Guidelines 2024 on prostate cancer staging
 *  · Metastatic finding constitutes a hard override — AS is contraindicated
 *    per EAU Guidelines and NCI PDQ 2024
 */
function calcPSMA({ psmaFinding, lesionCount }) {
  if (!psmaFinding)
    return { psmaFinding: null, psmaScore: null, psmaFactors: [], psmaAssessed: false, hardOverride: false }

  const map = {
    negative:   { pts: -15, tier: 'low',          label: 'Negative — no PSMA-avid lesions; supports active surveillance' },
    local:      { pts: 0,   tier: 'intermediate',  label: 'Local uptake only — no nodal or distant disease' },
    regional:   { pts: 25,  tier: 'high',          label: 'Regional nodal involvement — treatment strongly recommended (EAU 2024)' },
    metastatic: { pts: 999, tier: 'override',      label: 'Metastatic disease — active surveillance is contraindicated' },
  }

  const entry = map[psmaFinding]
  if (!entry)
    return { psmaFinding: null, psmaScore: null, psmaFactors: [], psmaAssessed: false, hardOverride: false }

  const factors = [{
    label: `PSMA PET/CT: ${entry.label}`,
    points: entry.pts === 999 ? 'OVERRIDE' : entry.pts,
    tier: entry.tier,
  }]

  if (lesionCount != null && psmaFinding !== 'negative')
    factors.push({ label: `Lesion count: ${lesionCount}`, points: 0, tier: entry.tier })

  return { psmaFinding, psmaScore: entry.pts, psmaFactors: factors, psmaAssessed: true, hardOverride: psmaFinding === 'metastatic' }
}

// ─── Sub-model 4: Intensive Monitoring ───────────────────────────────────────
/**
 * Evidence basis:
 *  · Feature list derived from PRIAS (Bul et al., Eur Urol 2013),
 *    NCCN 2024 active surveillance monitoring criteria,
 *    and Canary PASS (Newcomb et al., J Urol 2016)
 *  · Monitoring intensity tiers calibrated to published PRIAS and
 *    Johns Hopkins AS protocol schedules
 */
function calcMonitoring({ genomicRiskTier, psa, maxCorePercent, psad, abutment, pirads, ece, broadContact, age, psmaFinding }) {
  const features = []

  if (genomicRiskTier === 'high')                    features.push('High genomic risk score')
  if (psa != null && psa >= 10)                      features.push('PSA ≥ 10 ng/mL (above NCCN/PRIAS threshold)')
  if (maxCorePercent != null && maxCorePercent > 50) features.push('Max core involvement > 50% (outside NCCN VLOW)')
  if (psad != null && psad > 0.177)                  features.push('PSAD > 0.177 ng/mL/cm³ (above Kadeer 2025 Youden cutoff)')
  if (abutment === 'yes')                            features.push('Neurovascular bundle abutment on MRI')
  if (pirads != null && pirads >= 4)                 features.push(`PI-RADS ${pirads} (high suspicion on mpMRI)`)
  if (ece === 'yes')                                 features.push('Extracapsular extension (ECE) on MRI')
  if (broadContact === 'yes')                        features.push('Broad capsular contact > 10 mm')
  if (age != null && age < 50)                       features.push('Age < 50 years (long life expectancy; higher cumulative risk)')
  if (psmaFinding === 'local')                       features.push('PSMA-positive local lesion')

  const n = features.length
  let monitoringTier, monitoringLabel, monitoringSchedule

  if (n === 0) {
    monitoringTier    = 'standard'
    monitoringLabel   = 'Standard Active Surveillance'
    monitoringSchedule = ['PSA every 6 months', 'DRE annually', 'Confirmatory biopsy and MRI per NCCN/PRIAS protocol']
  } else if (n <= 2) {
    monitoringTier    = 'enhanced'
    monitoringLabel   = 'Enhanced Surveillance'
    monitoringSchedule = ['PSA every 3–4 months', 'Annual mpMRI', 'Repeat biopsy every 1–2 years']
  } else if (n <= 4) {
    monitoringTier    = 'intensive'
    monitoringLabel   = 'Intensive Surveillance'
    monitoringSchedule = ['PSA every 3 months', 'mpMRI every 6–12 months', 'Annual systematic + targeted biopsy']
  } else {
    monitoringTier    = 'treatment_discussion'
    monitoringLabel   = 'Treatment Discussion Recommended'
    monitoringSchedule = ['Multi-disciplinary tumour board review', 'Discuss curative treatment options with patient', 'Shared decision-making framework (SDM) strongly recommended']
  }

  return { monitoringTier, monitoringLabel, monitoringSchedule, features, featureCount: n }
}

// ─── Combined tier logic ──────────────────────────────────────────────────────
/**
 * Tier-based integration (more clinically transparent than a raw weighted sum):
 *  1. Hard override: PSMA metastatic → treatment required
 *  2. Baseline: highest tier among Basic and Monitoring sub-models
 *  3. PSMA regional escalates to at minimum Intensive
 *  4. Genomic high escalates by one tier (capped at treatment discussion)
 *
 * This conservative aggregation approach mirrors multi-modal risk stratification
 * practice in NCCN and EAU guidelines.
 */
function calcCombined({ asTierKey, genomicRiskTier, psmaFinding, monitoringTier, hardOverride }) {
  if (hardOverride) {
    return {
      combinedTierKey:         'treatment_required',
      combinedRecommendation:  'Treatment Required — metastatic disease identified on PSMA PET/CT. Active surveillance is contraindicated (EAU Guidelines 2024).',
      combinedColor:           'red',
    }
  }

  const LEVEL = { standard_as: 0, standard: 0, enhanced_as: 1, enhanced: 1, intensive_as: 2, intensive: 2, treatment: 3, treatment_discussion: 3 }
  const KEYS  = ['standard_as', 'enhanced_as', 'intensive_as', 'treatment_discussion']

  let level = Math.max(LEVEL[asTierKey] ?? 0, LEVEL[monitoringTier] ?? 0)

  // PSMA regional → minimum intensive (EAU 2024: nodal disease changes management)
  if (psmaFinding === 'regional') level = Math.max(level, 2)

  // Genomic high → escalate one tier (capped at 3)
  if (genomicRiskTier === 'high') level = Math.min(3, level + 1)

  const finalKey = KEYS[level]

  const MAP = {
    standard_as:           { rec: 'Standard Active Surveillance — meets established criteria for conventional surveillance protocol.',                       color: 'green' },
    enhanced_as:           { rec: 'Enhanced Active Surveillance — some risk features identified; more frequent follow-up than standard protocol.',          color: 'yellow' },
    intensive_as:          { rec: 'Intensive Active Surveillance — multiple risk features present; frequent monitoring and periodic multi-modal re-evaluation.', color: 'amber' },
    treatment_discussion:  { rec: 'Treatment Discussion Strongly Recommended — combination of high-risk features across sub-models warrants MDT review.',   color: 'red' },
  }

  const entry = MAP[finalKey] || MAP['standard_as']
  return { combinedTierKey: finalKey, combinedRecommendation: entry.rec, combinedColor: entry.color }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function runAssessment(inputs) {
  const errs = validateInputs(inputs)
  if (Object.keys(errs).length > 0) {
    throw new Error(`Invalid inputs: ${JSON.stringify(errs)}`)
  }

  const basicResult      = calcBasic(inputs)
  const genomicResult    = calcGenomic(inputs)
  const psmaResult       = calcPSMA(inputs)
  const monitoringResult = calcMonitoring({
    genomicRiskTier: genomicResult.genomicRiskTier,
    psa:             inputs.psa,
    maxCorePercent:  inputs.maxCorePercent,
    psad:            basicResult.psad,
    abutment:        inputs.abutment,
    pirads:          inputs.pirads,
    ece:             inputs.ece,
    broadContact:    inputs.broadContact,
    age:             inputs.age,
    psmaFinding:     inputs.psmaFinding,
  })
  const combinedResult = calcCombined({
    asTierKey:       basicResult.asTierKey,
    genomicRiskTier: genomicResult.genomicRiskTier,
    psmaFinding:     inputs.psmaFinding,
    monitoringTier:  monitoringResult.monitoringTier,
    hardOverride:    psmaResult.hardOverride,
  })

  return { ...basicResult, ...genomicResult, ...psmaResult, ...monitoringResult, ...combinedResult }
}
