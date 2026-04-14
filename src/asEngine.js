/**
 * asEngine.js — AI Surveillance Tool calculation engine
 *
 * Data-driven, guideline-guardrailed multi-model assessment for
 * post-biopsy Active Surveillance decision support.
 *
 * Three layers:
 *  1. GUIDELINE HARD STOPS  — absolute AUA/NCCN/EAU contraindications (checked first)
 *  2. FOUR-MODEL SCORING    — Basic+PSAD · Genomic · PSMA · Intensive Monitoring
 *  3. COHORT CALIBRATION    — N=94 Mount Sinai validation data for probability context
 *
 * Evidence basis embedded per sub-model below.
 */

// ─── Cohort calibration data ──────────────────────────────────────────────────
/**
 * Mount Sinai N=94 biopsied referral cohort (Tewari lab, 2024–2025)
 * 23 clinically significant PCa (csPCa, GG≥3) / 94 biopsied patients
 * All patients referred for biopsy — rates reflect a biopsied referral population,
 * not a general screening population.
 * Reference: Kadeer N et al., Eur Urol 2025 (pending PMID)
 */
export const COHORT_CALIBRATION = {
  overview: {
    n: 94,
    csPCa_events: 23,
    csPCa_rate: 0.245,
    definition: 'csPCa = Grade Group ≥ 3',
    note: 'Biopsied referral cohort — rates reflect referred/biopsied patients, not a general screening population',
  },

  // ePSA pre-biopsy tier → probability that biopsy showed GG1-2 (AS-eligible histology)
  epsa_to_as_eligible: {
    low:                { pct: 0.89, note: 'ePSA score 0–10, N≈14' },
    intermediate:       { pct: 0.80, note: 'ePSA score 11–17, N≈5' },
    'intermediate-high':{ pct: 0.72, note: 'Combined ePSA tier 28–55 pts, N=58' },
    elevated:           { pct: 0.72, note: 'ePSA score ≥18, N=75' },
    high:               { pct: 0.69, note: 'Combined ePSA tier ≥56 pts, N=32' },
  },

  // PSAD thresholds validated in N=94 cohort (Kadeer et al. 2025)
  psad: {
    youden_optimal:        0.177,
    nccn_vlow:             0.15,
    auc:                   0.624,
    sensitivity_at_youden: 0.782,
    specificity_at_youden: 0.511,
    source: 'Kadeer et al. 2025, N=94 Mount Sinai cohort',
  },

  // ePSA model performance for GG1 prediction vs PSA alone
  epsa_performance: {
    auc_gg1:       0.624,
    auc_psa_alone: 0.513,
    delta_auc:     0.111,
    note: 'AUC improvement not yet statistically significant at N=94 (p=0.725)',
  },

  // Annual GG upgrading risk by combined monitoring tier
  // Literature-derived where cohort-specific AS follow-up data is pending
  // Sources: PRIAS (Bul 2013), Johns Hopkins AS protocol, Canary PASS (Newcomb 2016)
  tier_annual_upgrade_risk: {
    standard_as:         { risk: 0.03, ci: '2–5%',   source: 'PRIAS + Johns Hopkins AS cohort data' },
    enhanced_as:         { risk: 0.08, ci: '5–12%',  source: 'Unfavorable intermediate risk AS programs' },
    intensive_as:        { risk: 0.20, ci: '15–30%', source: 'High-feature AS programs; short-interval biopsy recommended' },
    treatment_discussion:{ risk: null, note: 'MDT review required before AS enrollment decision' },
  },
}

// ─── Guideline hard stops ─────────────────────────────────────────────────────
/**
 * Absolute contraindications to active surveillance:
 *  · AUA/ASTRO Clinically Localized PCa Guidelines 2022
 *  · NCCN Prostate Cancer Version 3.2024
 *  · EAU-EANM-ESTRO-ESUR-SIOG Guidelines 2024
 */
export const GUIDELINE_HARD_STOPS = [
  {
    id: 'ggg4_5',
    check: (inputs) => Number(inputs.ggg) >= 4,
    label: 'High / Very High Risk (GG4–5)',
    message:
      'Grade Group 4 or 5 — Active surveillance is not appropriate per NCCN 2024 and AUA 2022 guidelines. ' +
      'Definitive treatment (radical prostatectomy or radiation therapy) should be discussed with the patient promptly.',
    source: 'NCCN Prostate Cancer 2024; AUA/ASTRO Clinically Localized PCa Guidelines 2022',
    outcome: 'treatment_required',
  },
  {
    id: 'psma_metastatic',
    check: (inputs) => inputs.psmaFinding === 'metastatic',
    label: 'Metastatic Disease on PSMA PET/CT',
    message:
      'Metastatic disease identified on PSMA PET/CT — Active surveillance is contraindicated. ' +
      'Systemic therapy (ADT ± novel hormonal agents) is indicated per EAU Guidelines 2024.',
    source: 'EAU-EANM-ESTRO-ESUR-SIOG Guidelines 2024',
    outcome: 'systemic_treatment',
  },
]

// ─── Input validation ─────────────────────────────────────────────────────────
export function validateInputs(inputs) {
  const errors = {}

  if (inputs.ggg == null || ![1, 2, 3, 4, 5].includes(Number(inputs.ggg)))
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
    errors.pirads = 'PI-RADS score is required (use 0 if no MRI performed)'

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

  if (inputs.psaVelocity != null && inputs.psaVelocity !== '' &&
      Number(inputs.psaVelocity) < 0)
    errors.psaVelocity = 'Must be ≥ 0 ng/mL/year'

  if (inputs.psaDoublingTime != null && inputs.psaDoublingTime !== '' &&
      Number(inputs.psaDoublingTime) < 0)
    errors.psaDoublingTime = 'Must be ≥ 0 years'

  return errors
}

// ─── Hard stop check ──────────────────────────────────────────────────────────
function checkHardStops(inputs) {
  for (const stop of GUIDELINE_HARD_STOPS) {
    if (stop.check(inputs)) return stop
  }
  return null
}

// ─── Sub-model 1: Basic + PSAD ────────────────────────────────────────────────
/**
 * Evidence basis:
 *  · GGG (ISUP 2016): Epstein JI et al., Eur Urol 2016;69(3):428–435
 *  · Core burden (NCCN 2024 VLOW): ≤2 positive cores, no core > 50%
 *    Bastian PJ et al., J Urol 2004; Epstein JI et al., J Urol 1994
 *  · PSAD 0.15 ng/mL/cm³ — NCCN 2024 very low risk upper bound
 *  · PSAD 0.177 ng/mL/cm³ — Kadeer et al. 2025 Youden optimal (N=94 cohort, AUC 0.624)
 *  · PI-RADS v2.1: Turkbey B et al., Eur Urol 2019;76(3):340–351
 */
function calcBasic({ ggg, positiveCores, totalCores, maxCorePercent, psa, prostateVolume, pirads, epsaPreBiopsyTier }) {
  const factors = []
  let score = 0
  const gggNum = Number(ggg)

  // GGG — ISUP 2016 (hard stop catches ≥4 before reaching here)
  {
    const ptsMap   = { 1: 0, 2: 8, 3: 22, 4: 28, 5: 35 }
    const tierMap  = { 1: 'low', 2: 'low', 3: 'intermediate', 4: 'high', 5: 'high' }
    const glossary = { 1: '3+3=6', 2: '3+4=7', 3: '4+3=7', 4: '4+4=8', 5: '9–10' }
    const pts  = ptsMap[gggNum]
    const tier = tierMap[gggNum]
    score += pts
    factors.push({
      label: `Grade Group ${gggNum} — Gleason ${glossary[gggNum]}`,
      points: pts,
      tier,
      basis: gggNum <= 2
        ? 'NCCN 2024: eligible for active surveillance consideration'
        : gggNum === 3
        ? 'NCCN 2024: unfavourable-intermediate — outside standard AS criteria'
        : 'NCCN 2024: high / very high risk — AS not recommended',
    })
  }

  // Core ratio
  if (positiveCores != null && totalCores != null && Number(totalCores) > 0) {
    const ratio = Number(positiveCores) / Number(totalCores)
    let pts = 0; let tier = 'low'
    if      (ratio > 0.50) { pts = 12; tier = 'high' }
    else if (ratio > 0.33) { pts = 8;  tier = 'high' }
    else if (ratio > 0.17) { pts = 4;  tier = 'intermediate' }
    score += pts
    factors.push({
      label: `Core ratio ${positiveCores}/${totalCores} (${Math.round(ratio * 100)}%)`,
      points: pts,
      tier,
      basis: ratio <= 0.17
        ? 'Meets NCCN 2024 very low risk criterion (< 3 of 12 cores)'
        : ratio <= 0.33
        ? 'Approaching NCCN very low risk core number limit'
        : 'Outside NCCN 2024 very low risk core criterion',
    })
  }

  // Max core involvement
  if (maxCorePercent != null) {
    const pct  = Number(maxCorePercent)
    const pts  = pct > 50 ? 10 : 0
    const tier = pct > 50 ? 'high' : 'low'
    score += pts
    factors.push({
      label: `Max core involvement ${pct}%`,
      points: pts,
      tier,
      basis: pct <= 50
        ? 'Within NCCN 2024 very low risk (≤ 50% per core)'
        : 'Exceeds NCCN 2024 very low risk threshold (> 50% per core)',
    })
  }

  // PSAD — dual threshold: NCCN 0.15 + Kadeer 2025 Youden 0.177
  let psad = null
  if (psa != null && prostateVolume != null && Number(prostateVolume) > 0) {
    psad = Number(psa) / Number(prostateVolume)
    let pts = 0; let tier = 'low'
    if      (psad > 0.177) { pts = 12; tier = 'high' }
    else if (psad > 0.15)  { pts = 5;  tier = 'intermediate' }
    else if (psad > 0.10)  { pts = 0;  tier = 'low' }
    else                   { pts = -5; tier = 'low' }
    score += pts
    factors.push({
      label: `PSA Density ${psad.toFixed(3)} ng/mL/cm³`,
      points: pts,
      tier,
      basis: psad > 0.177
        ? 'Above Kadeer 2025 Youden cutoff (0.177) — AUC 0.624 in N=94 Mount Sinai cohort'
        : psad > 0.15
        ? 'Above NCCN 2024 very low risk threshold (0.15); below Kadeer 2025 cutoff'
        : 'Within NCCN 2024 very low risk PSAD range (≤ 0.15 ng/mL/cm³)',
    })
  } else if (psa != null) {
    const psaNum = Number(psa)
    let pts = 0; let tier = 'low'
    if      (psaNum >= 10) { pts = 10; tier = 'high' }
    else if (psaNum >= 4)  { pts = 0;  tier = 'intermediate' }
    else                   { pts = -3; tier = 'low' }
    score += pts
    factors.push({
      label: `PSA ${psaNum} ng/mL (prostate volume not provided — PSAD unavailable)`,
      points: pts,
      tier,
      basis: psaNum >= 10
        ? 'Above NCCN 2024 / PRIAS threshold (PSA ≤ 10 ng/mL for AS eligibility)'
        : 'Below NCCN / PRIAS PSA threshold — enter prostate volume for full PSAD analysis',
    })
  }

  // PI-RADS v2.1 (pirads=0 means no MRI)
  if (pirads != null && Number(pirads) > 0) {
    const p = Number(pirads)
    const ptsMap  = { 1: -5, 2: -3, 3: 0, 4: 8, 5: 15 }
    const tierMap = { 1: 'low', 2: 'low', 3: 'intermediate', 4: 'high', 5: 'high' }
    const pts  = ptsMap[p] ?? 0
    const tier = tierMap[p] ?? 'intermediate'
    score += pts
    factors.push({
      label: `PI-RADS ${p}`,
      points: pts,
      tier,
      basis: p <= 2
        ? 'PI-RADS v2.1: low probability of clinically significant cancer'
        : p === 3
        ? 'PI-RADS v2.1: equivocal — requires clinical judgment'
        : p === 4
        ? 'PI-RADS v2.1: high probability of clinically significant cancer'
        : 'PI-RADS v2.1: very high probability — biopsy/treatment discussion urgently recommended',
    })
  }

  // ePSA pre-biopsy context
  if (epsaPreBiopsyTier === 'high' || epsaPreBiopsyTier === 'intermediate-high') {
    const pts = epsaPreBiopsyTier === 'high' ? 1 : 0.5
    score += pts
    factors.push({
      label: `Elevated pre-biopsy ePSA tier (${epsaPreBiopsyTier === 'high' ? 'High' : 'Intermediate-High'})`,
      points: pts,
      tier: 'intermediate',
      basis: 'ePSA pre-biopsy risk context (Mount Sinai N=94 cohort)',
    })
  }

  let asTierKey
  if      (score <= 3)  asTierKey = 'standard_as'
  else if (score <= 20) asTierKey = 'enhanced_as'
  else if (score <= 45) asTierKey = 'intensive_as'
  else                  asTierKey = 'treatment'

  return { asTierKey, asScore: score, asFactors: factors, psad }
}

// ─── Sub-model 2: Genomic ─────────────────────────────────────────────────────
/**
 * Evidence basis:
 *  · Decipher (0.45 / 0.60): Spratt DE et al., Lancet Oncol 2014; Nguyen PL et al. 2021
 *  · Oncotype DX GPS (20 / 40): Klein EA et al., Eur Urol 2021
 *  · Prolaris CCP (1.5 / 2.1): Cooperberg MR et al., Cancer 2013
 *  · ConfirmMDx: Stewart GD et al., J Urol 2013
 */
function calcGenomic({ decipher, gps, prolaris, confirmMDx }) {
  const factors = []
  let score = 0
  let assessed = false

  if (decipher != null && decipher !== '') {
    assessed = true
    const d = Number(decipher)
    let pts, tier
    if      (d >= 0.60) { pts = 15;  tier = 'high' }
    else if (d >= 0.45) { pts = 8;   tier = 'intermediate' }
    else                { pts = -10; tier = 'low' }
    score += pts
    factors.push({
      label: `Decipher — ${d.toFixed(2)}`,
      points: pts,
      tier,
      basis: d >= 0.60
        ? 'High risk (≥ 0.60) — Spratt 2014: strongly predicts metastatic progression'
        : d >= 0.45
        ? 'Intermediate risk (0.45–0.59) — enhanced monitoring warranted'
        : 'Low risk (< 0.45) — supports active surveillance candidacy',
    })
  }

  if (gps != null && gps !== '') {
    assessed = true
    const g = Number(gps)
    let pts, tier
    if      (g >= 40) { pts = 12;  tier = 'high' }
    else if (g >= 20) { pts = 5;   tier = 'intermediate' }
    else              { pts = -8;  tier = 'low' }
    score += pts
    factors.push({
      label: `Oncotype DX GPS — ${g}`,
      points: pts,
      tier,
      basis: g >= 40
        ? 'High GPS (≥ 40) — Klein 2021: unfavorable; treatment discussion recommended'
        : g >= 20
        ? 'Intermediate GPS (20–39) — enhanced surveillance'
        : 'Low GPS (< 20) — favorable for active surveillance',
    })
  }

  if (prolaris != null && prolaris !== '') {
    assessed = true
    const p = Number(prolaris)
    let pts, tier
    if      (p >= 2.1) { pts = 12;  tier = 'high' }
    else if (p >= 1.5) { pts = 5;   tier = 'intermediate' }
    else               { pts = -8;  tier = 'low' }
    score += pts
    factors.push({
      label: `Prolaris CCP — ${p}`,
      points: pts,
      tier,
      basis: p >= 2.1
        ? 'High CCP (≥ 2.1) — Cooperberg 2013: elevated risk of progression'
        : p >= 1.5
        ? 'Intermediate CCP (1.5–2.0) — enhanced monitoring'
        : 'Low CCP (< 1.5) — supports surveillance',
    })
  }

  if (confirmMDx != null && confirmMDx !== 'not_done') {
    assessed = true
    const pts  = confirmMDx === 'positive' ? 10 : -8
    const tier = confirmMDx === 'positive' ? 'high' : 'low'
    score += pts
    factors.push({
      label: `ConfirmMDx — ${confirmMDx === 'positive' ? 'positive (field cancerization)' : 'negative'}`,
      points: pts,
      tier,
      basis: confirmMDx === 'positive'
        ? 'Stewart 2013: positive result associated with occult cancer; repeat biopsy recommended'
        : 'Negative ConfirmMDx: lower probability of missed cancer on negative biopsy',
    })
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
 *  · Metastatic finding = hard override (also caught by GUIDELINE_HARD_STOPS)
 */
function calcPSMA({ psmaFinding, lesionCount }) {
  if (!psmaFinding || psmaFinding === 'not_done')
    return { psmaFinding: null, psmaScore: null, psmaFactors: [], psmaAssessed: false, hardOverride: false }

  const map = {
    negative:   { pts: -15, tier: 'low',         label: 'Negative — no PSMA-avid lesions; supports active surveillance' },
    local:      { pts: 0,   tier: 'intermediate', label: 'Local uptake only — no nodal or distant disease' },
    regional:   { pts: 25,  tier: 'high',         label: 'Regional nodal involvement — treatment strongly recommended (EAU 2024)' },
    metastatic: { pts: 999, tier: 'override',     label: 'Metastatic disease — AS contraindicated (EAU 2024)' },
  }

  const entry = map[psmaFinding]
  if (!entry)
    return { psmaFinding: null, psmaScore: null, psmaFactors: [], psmaAssessed: false, hardOverride: false }

  const factors = [{
    label: `PSMA PET/CT: ${entry.label}`,
    points: entry.pts === 999 ? 'OVERRIDE' : entry.pts,
    tier: entry.tier,
    basis: 'EAU-EANM-ESTRO-ESUR-SIOG Guidelines 2024',
  }]

  if (lesionCount != null && psmaFinding !== 'negative') {
    factors.push({ label: `Lesion count: ${lesionCount}`, points: 0, tier: entry.tier, basis: 'Lesion burden for staging context' })
  }

  return { psmaFinding, psmaScore: entry.pts, psmaFactors: factors, psmaAssessed: true, hardOverride: psmaFinding === 'metastatic' }
}

// ─── Sub-model 4: Intensive Monitoring ───────────────────────────────────────
/**
 * Evidence basis:
 *  · PRIAS (Bul et al., Eur Urol 2013) — exit criteria and monitoring intensity
 *  · NCCN 2024 AS monitoring criteria
 *  · Canary PASS (Newcomb et al., J Urol 2016)
 *  · D'Amico AV et al., JAMA 2004 — PSA velocity threshold ≥ 2 ng/mL/yr
 *  · PRIAS exit criteria — PSA doubling time < 3 years (Bul 2013)
 *  · NCCN 2024: BRCA2/HOXB13 — enhanced monitoring or treatment preferred
 */
function calcMonitoring({
  genomicRiskTier, psa, maxCorePercent, psad, abutment, pirads,
  ece, broadContact, age, psmaFinding,
  psaVelocity, psaDoublingTime, germlineVariant,
}) {
  const features = []

  if (genomicRiskTier === 'high')
    features.push({ label: 'High genomic risk score', source: 'Decipher / GPS / Prolaris high-risk threshold' })

  if (psa != null && Number(psa) >= 10)
    features.push({ label: `PSA ${psa} ng/mL (above NCCN/PRIAS threshold of 10 ng/mL)`, source: 'NCCN 2024; PRIAS protocol' })

  if (maxCorePercent != null && Number(maxCorePercent) > 50)
    features.push({ label: `Max core involvement ${maxCorePercent}% (> 50% — outside NCCN very low risk)`, source: 'Bastian 2004; NCCN 2024' })

  if (psad != null && psad > 0.177)
    features.push({ label: `PSAD ${psad.toFixed(3)} ng/mL/cm³ (> Kadeer 2025 Youden cutoff 0.177)`, source: 'Kadeer et al. 2025, N=94 cohort' })

  if (abutment === 'yes')
    features.push({ label: 'Neurovascular bundle (NVB) abutment on mpMRI', source: 'EAU Guidelines 2024 staging criteria' })

  if (pirads != null && Number(pirads) >= 4)
    features.push({ label: `PI-RADS ${pirads} — high suspicion on mpMRI (≥ 4)`, source: 'Turkbey 2019; PI-RADS v2.1' })

  if (ece === 'yes')
    features.push({ label: 'Extracapsular extension (ECE) on imaging', source: 'NCCN 2024 staging; EAU 2024' })

  if (broadContact === 'yes')
    features.push({ label: 'Broad capsular contact > 10 mm on mpMRI', source: 'EAU Guidelines 2024' })

  if (age != null && Number(age) < 50)
    features.push({ label: `Age ${age} years (< 50 — long life expectancy, elevated cumulative risk)`, source: 'PRIAS; AUA/ASTRO 2022' })

  if (psmaFinding === 'local')
    features.push({ label: 'PSMA-positive local lesion (no nodal/distant spread)', source: 'EAU-EANM-ESTRO-ESUR-SIOG 2024' })

  if (psaVelocity != null && psaVelocity !== '' && Number(psaVelocity) >= 2)
    features.push({ label: `PSA velocity ${Number(psaVelocity).toFixed(2)} ng/mL/yr (≥ 2.0 — D'Amico threshold)`, source: "D'Amico AV et al., JAMA 2004; NCCN 2024" })

  if (psaDoublingTime != null && psaDoublingTime !== '' && Number(psaDoublingTime) > 0 && Number(psaDoublingTime) < 3)
    features.push({ label: `PSA doubling time ${Number(psaDoublingTime).toFixed(1)} yr (< 3 yr — PRIAS exit criterion)`, source: 'Bul M et al., PRIAS, Eur Urol 2013' })

  if (germlineVariant === 'brca2')
    features.push({ label: 'Germline BRCA2 pathogenic variant', source: 'NCCN 2024: enhanced monitoring or treatment preferred for BRCA2 carriers' })

  if (germlineVariant === 'hoxb13')
    features.push({ label: 'Germline HOXB13 pathogenic variant', source: 'NCCN 2024: hereditary prostate cancer — closer surveillance warranted' })

  const n = features.length
  let monitoringTier, monitoringLabel, monitoringSchedule

  if (n === 0) {
    monitoringTier     = 'standard'
    monitoringLabel    = 'Standard Active Surveillance'
    monitoringSchedule = [
      'PSA every 6 months',
      'Digital rectal exam (DRE) annually',
      'Confirmatory MRI-targeted biopsy at 12–18 months (NCCN/PRIAS protocol)',
      'Ongoing biopsies every 2–5 years if stable',
    ]
  } else if (n <= 2) {
    monitoringTier     = 'enhanced'
    monitoringLabel    = 'Enhanced Surveillance'
    monitoringSchedule = [
      'PSA every 3–4 months',
      'Annual mpMRI',
      'Repeat systematic + targeted biopsy every 1–2 years',
      'Consider genomic testing if not yet performed',
      'Re-evaluate for treatment escalation annually',
    ]
  } else if (n <= 4) {
    monitoringTier     = 'intensive'
    monitoringLabel    = 'Intensive Surveillance'
    monitoringSchedule = [
      'PSA every 3 months',
      'mpMRI every 6–12 months',
      'Annual systematic + targeted biopsy',
      'Multi-disciplinary team (MDT) review at 12 months',
      'Low threshold for treatment discussion if any feature worsens',
    ]
  } else {
    monitoringTier     = 'treatment_discussion'
    monitoringLabel    = 'Treatment Discussion Strongly Recommended'
    monitoringSchedule = [
      'Multi-disciplinary tumour board (MDT) review',
      'Discuss curative treatment options (surgery or radiation)',
      'Shared decision-making framework strongly recommended',
      'If AS elected: 6-month biopsy intervals with PSA every 3 months',
    ]
  }

  return { monitoringTier, monitoringLabel, monitoringSchedule, features, featureCount: n }
}

// ─── Cohort context ───────────────────────────────────────────────────────────
function calcCohortContext(combinedTierKey, epsaPreBiopsyTier) {
  const tierData = COHORT_CALIBRATION.tier_annual_upgrade_risk[combinedTierKey] || {}
  const epsaData = epsaPreBiopsyTier
    ? (COHORT_CALIBRATION.epsa_to_as_eligible[epsaPreBiopsyTier] || {})
    : {}

  return {
    annualUpgradeRisk:      tierData.risk ?? null,
    annualUpgradeRiskRange: tierData.ci ?? null,
    annualUpgradeSource:    tierData.source ?? null,
    epsaAsEligiblePct:      epsaData.pct ?? null,
    epsaAsEligibleNote:     epsaData.note ?? null,
    cohortN:                COHORT_CALIBRATION.overview.n,
    psadYoudenCutoff:       COHORT_CALIBRATION.psad.youden_optimal,
    psadAuc:                COHORT_CALIBRATION.psad.auc,
    cohortNote:             COHORT_CALIBRATION.overview.note,
  }
}

// ─── Combined tier logic ──────────────────────────────────────────────────────
/**
 * Tier-based integration (clinically transparent, mirrors NCCN/EAU multi-modal approach):
 *  1. Hard override: PSMA metastatic → treatment required (caught earlier by hard stop)
 *  2. Baseline: highest tier among Basic and Monitoring sub-models
 *  3. PSMA regional → escalate to minimum Intensive (EAU 2024: nodal disease changes management)
 *  4. Genomic high → escalate one tier (capped at treatment_discussion)
 */
function calcCombined({ asTierKey, genomicRiskTier, psmaFinding, monitoringTier, hardOverride }) {
  if (hardOverride) {
    return {
      combinedTierKey:        'treatment_required',
      combinedRecommendation: 'Treatment Required — metastatic disease on PSMA PET/CT. Active surveillance is contraindicated (EAU Guidelines 2024).',
      combinedColor:          'red',
    }
  }

  const LEVEL = {
    standard_as: 0, standard: 0,
    enhanced_as: 1, enhanced: 1,
    intensive_as: 2, intensive: 2,
    treatment: 3, treatment_discussion: 3,
  }
  const KEYS = ['standard_as', 'enhanced_as', 'intensive_as', 'treatment_discussion']

  let level = Math.max(LEVEL[asTierKey] ?? 0, LEVEL[monitoringTier] ?? 0)
  if (psmaFinding === 'regional') level = Math.max(level, 2)
  if (genomicRiskTier === 'high') level = Math.min(3, level + 1)

  const finalKey = KEYS[level]

  const MAP = {
    standard_as:         { rec: 'Standard Active Surveillance — meets established criteria for conventional surveillance protocol per NCCN 2024 and PRIAS.',                                      color: 'green'  },
    enhanced_as:         { rec: 'Enhanced Active Surveillance — some risk features identified; more frequent PSA and MRI follow-up than standard protocol.',                                      color: 'yellow' },
    intensive_as:        { rec: 'Intensive Active Surveillance — multiple risk features present; frequent multi-modal monitoring and low threshold for treatment escalation.',                     color: 'amber'  },
    treatment_discussion:{ rec: 'Treatment Discussion Strongly Recommended — combination of high-risk features across sub-models warrants MDT review and shared decision-making with the patient.', color: 'red'    },
  }

  const entry = MAP[finalKey] || MAP.standard_as
  return { combinedTierKey: finalKey, combinedRecommendation: entry.rec, combinedColor: entry.color }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function runAssessment(inputs) {
  // 1. Validate inputs
  const errs = validateInputs(inputs)
  if (Object.keys(errs).length > 0) {
    throw new Error(`Invalid inputs: ${JSON.stringify(errs)}`)
  }

  // 2. Check guideline hard stops — absolute contraindications override all scoring
  const hardStop = checkHardStops(inputs)
  if (hardStop) {
    return {
      hardStop:               true,
      hardStopId:             hardStop.id,
      hardStopLabel:          hardStop.label,
      hardStopMessage:        hardStop.message,
      hardStopSource:         hardStop.source,
      hardStopOutcome:        hardStop.outcome,
      combinedTierKey:        hardStop.outcome,
      combinedColor:          'red',
      combinedRecommendation: hardStop.message,
      asFactors: [], genomicFactors: [], psmaFactors: [], features: [],
      genomicAssessed: false, psmaAssessed: false,
      cohortContext: null,
    }
  }

  // 3. Run four sub-models
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
    psaVelocity:     inputs.psaVelocity,
    psaDoublingTime: inputs.psaDoublingTime,
    germlineVariant: inputs.germlineVariant,
  })
  const combinedResult = calcCombined({
    asTierKey:       basicResult.asTierKey,
    genomicRiskTier: genomicResult.genomicRiskTier,
    psmaFinding:     inputs.psmaFinding,
    monitoringTier:  monitoringResult.monitoringTier,
    hardOverride:    psmaResult.hardOverride,
  })

  // 4. Add cohort probability context
  const cohortContext = calcCohortContext(
    combinedResult.combinedTierKey,
    inputs.epsaPreBiopsyTier,
  )

  return {
    hardStop: false,
    ...basicResult,
    ...genomicResult,
    ...psmaResult,
    ...monitoringResult,
    ...combinedResult,
    cohortContext,
  }
}
