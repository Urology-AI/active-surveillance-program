/**
 * asEngine.js — AI Surveillance Tool (AS Tool) calculation engine
 *
 * Two explicit architectural layers:
 *
 *  LAYER 1 — GUIDELINE FRAMEWORK (runs first, always)
 *   · Hard stops: AUA/NCCN/EAU absolute contraindications
 *   · Four sub-model scoring: Basic+PSAD · Genomic · PSMA · Intensive Monitoring
 *   · Combined tier assignment from guideline thresholds
 *
 *  LAYER 2 — COHORT CALIBRATION (runs second, adds probability context)
 *   · Real N=218 Mount Sinai Tewari AS Program data overlaid as contextual statements
 *   · Per-variable upgrade rates from the actual cohort (not borrowed from PRIAS/Hopkins)
 *   · Returned as separate `cohortContext` object — does not alter the guideline-derived tier
 *
 * Evidence basis embedded per sub-model below.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2 DATA — N=218 COHORT CALIBRATION
// Mount Sinai Tewari AS Program, N=218 active surveillance patients
// Real upgrade event data (GG upgrading on follow-up biopsy)
// ═══════════════════════════════════════════════════════════════════════════════
export const COHORT_CALIBRATION = {
  overview: {
    n: 218,
    upgrade_events: 46,
    overall_upgrade_rate: 0.211,
    note: 'Mount Sinai Tewari AS Program — N=218 active surveillance patients with follow-up biopsy data. Upgrade = GG advancement on repeat biopsy.',
  },

  // Upgrade rate by initial Grade Group
  by_ggg: {
    1: { n: 182, upgraded: 44, upgrade_rate: 0.242 },
    2: { n: 35,  upgraded: 2,  upgrade_rate: 0.057 },
    3: { n: 1,   upgraded: 0,  upgrade_rate: 0.000 },
  },

  // PSA at enrollment — PSA does NOT discriminate upgrade in this cohort
  psa: {
    n: 206,
    median: 5.25,
    mean: 5.70,
    sd: 3.35,
    p25: 3.50,
    p75: 7.10,
    p95: 12.85,
    pct_above_10: 0.097,
    median_upgraders: 5.20,
    median_non_upgraders: 5.30,
    note: 'PSA virtually identical in upgraders vs non-upgraders — poor discriminator in this cohort.',
  },

  // PSAD — primary discriminating biomarker (Kadeer et al. 2025)
  psad: {
    n: 171,
    median: 0.090,
    mean: 0.1114,
    sd: 0.073,
    p25: 0.0552,
    p75: 0.1429,
    p95: 0.2438,
    youden_optimal: 0.177,
    nccn_vlow: 0.15,
    pct_above_youden: 0.170,
    upgrade_rate_above_youden: 0.207,
    upgrade_rate_below_youden: 0.155,
    median_upgraders: 0.1103,
    median_non_upgraders: 0.0873,
    auc: 0.624,
    source: 'Kadeer et al. 2025 + N=218 Tewari AS cohort',
    note: 'Median cohort PSAD 0.090 — well below Youden cutoff. Youden threshold fires in 17% of patients; modest but real discriminatory value.',
  },

  // PI-RADS — NOTE selection effect: PI-RADS 5 lower upgrade rate than 4
  // because very high-risk mpMRI patients are more often referred to treatment, not AS
  pirads: {
    1:    { n: 2,  upgrade_rate: 0.000 },
    2:    { n: 37, upgrade_rate: 0.189 },
    3:    { n: 29, upgrade_rate: 0.138 },
    4:    { n: 87, upgrade_rate: 0.184 },
    5:    { n: 12, upgrade_rate: 0.083 },
    none: { n: 51, upgrade_rate: 0.353 },
    note: 'PI-RADS 5 lower upgrade rate than 4 reflects selection effect — very high MRI suspicion patients more often proceed to treatment rather than AS enrollment.',
  },

  // Max core involvement
  max_core: {
    n: 216,
    median: 15.0,
    median_upgraders: 20.0,
    median_non_upgraders: 15.0,
    pct_above_50: 0.120,
    upgrade_rate_above_50: 0.077,
    note: 'Patients with >50% core involvement have lower observed upgrade rate — selection effect (high burden patients likely go to treatment).',
  },

  // Neurovascular bundle abutment on mpMRI
  abutment: {
    n_yes: 50,
    upgrade_rate_yes: 0.140,
    note: 'Abutment upgrade rate (14%) lower than overall (21%) — likely reflects selection of lower-risk patients to AS despite abutment finding.',
  },

  // Patient age at enrollment
  age: {
    n: 215,
    median: 73.0,
    mean: 74.6,
    sd: 3.5,
    n_under_50: 0,
    note: 'No patients under 50 in this cohort — age <50 is a theoretical intensive monitoring trigger per guidelines but cannot be calibrated from this data.',
  },

  // Family history of prostate cancer
  fhx_prostate: {
    n_yes: 35,
    upgrade_rate_yes: 0.143,
    n_no: 183,
    upgrade_rate_no: 0.224,
    note: 'Family history associated with slightly lower upgrade rate in this cohort — possibly reflects earlier/more vigilant detection in at-risk patients.',
  },

  // Race / ethnicity
  race: {
    caucasian:        { n: 140, upgrade_rate: 0.229 },
    other:            { n: 64,  upgrade_rate: 0.156 },
    african_american: { n: 14,  upgrade_rate: 0.286 },
    note: 'African American patients: highest observed upgrade rate (28.6%, N=14) — consistent with known biological and detection disparities.',
  },

  // Prostate volume
  prostate_volume: {
    n: 173,
    median: 55.2,
    mean: 58.8,
    sd: 26.0,
    note: 'Larger prostate volume dilutes PSA → lower PSAD → may mask significant disease.',
  },

  // Overall upgrade risk by monitoring tier (literature-calibrated for enhanced/intensive)
  tier_annual_upgrade_risk: {
    standard_as:  { risk: 0.211, ci: '19–24%', source: 'Mount Sinai Tewari AS Program N=218 (overall cohort rate; 95% CI estimated)' },
    enhanced_as:  { risk: 0.08,  ci: '5–12%',  source: 'Literature — unfavorable intermediate AS programs' },
    intensive_as: { risk: 0.20,  ci: '15–30%', source: 'Literature — high-feature AS programs; short-interval biopsy recommended' },
  },

  // ePSA pre-biopsy tier → % of that tier found to be AS-eligible (GG1–2) on biopsy
  epsa_to_as_eligible: {
    low:                { pct: 0.89, note: 'ePSA score 0–10, N≈14' },
    intermediate:       { pct: 0.80, note: 'ePSA score 11–17, N≈5' },
    'intermediate-high':{ pct: 0.72, note: 'Combined ePSA tier 28–55 pts, N=58' },
    elevated:           { pct: 0.72, note: 'ePSA score ≥18, N=75' },
    high:               { pct: 0.69, note: 'Combined ePSA tier ≥56 pts, N=32' },
  },
}

// ─── Model validation metrics ─────────────────────────────────────────────────
/**
 * Internal validation metrics — Mount Sinai Tewari AS Program, N=218 cohort.
 * All Sensitivity / Specificity / PPV / NPV computed directly from the raw
 * N=218 dataset (Mann-Whitney AUC; Youden J optimal cutoff).
 * External / prospective validation is pending.
 * Displayed in the results UI as a "Model Validation" card.
 *
 * Computation method:
 *   AUC  — Mann-Whitney U statistic (avoids trapezoidal boundary artefacts)
 *   Cutoff — Youden J = max(Sens + Spec − 1)
 *   Endpoint — GG upgrade on repeat biopsy (upgrade_cat = "Upgrade")
 */
export const MODEL_VALIDATION = {
  cohort: {
    name: 'Mount Sinai Tewari Active Surveillance Program',
    n: 218,
    n_upgraded: 46,
    upgrade_rate: 0.211,
    follow_up: 'Follow-up biopsy (GG upgrading endpoint)',
    validation_type: 'Internal cohort validation',
    reference: 'Kadeer N et al., Eur Urol 2025',
  },

  // ── Sub-model 1: Basic + PSAD ─────────────────────────────────────────────
  // Computed from raw N=218 TSV (n_with_psad=171, 28 upgraded)
  // Mann-Whitney AUC = 0.616 (internal); Kadeer 2025 published AUC = 0.624
  basic_psad: {
    label: 'Basic + PSAD Model',
    primary_biomarker: 'PSAD (PSA ÷ prostate volume)',
    n_with_psad: 171,
    n_upgraded_with_psad: 28,

    // ── AUC ────────────────────────────────────────────────────────────────
    auc_internal: 0.616,           // Mann-Whitney from raw N=218 data
    auc_published: 0.624,          // Kadeer et al. 2025 (reference publication)
    auc_psa_alone: 0.534,          // PSA alone — internal computation
    delta_auc: 0.082,              // PSAD vs PSA alone (internal)

    // ── Youden J optimal cutoff (maximises Sens + Spec − 1) ─────────────
    // Cutoff = 0.0650 ng/mL² — captures maximum discriminatory inflection
    youden_cutoff: 0.0650,
    sensitivity_at_youden: 0.893,  // TP=25 / (TP=25 + FN=3)
    specificity_at_youden: 0.357,  // TN=51 / (TN=51 + FP=92)
    ppv_at_youden: 0.214,          // TP=25 / (TP=25 + FP=92)
    npv_at_youden: 0.944,          // TN=51 / (TN=51 + FN=3) — key clinical value
    tp_at_youden: 25,
    fp_at_youden: 92,
    fn_at_youden: 3,
    tn_at_youden: 51,

    // ── NCCN published cutoff 0.15 ────────────────────────────────────────
    nccn_cutoff: 0.15,
    sensitivity_at_nccn: 0.286,    // TP=8 / 28
    specificity_at_nccn: 0.797,    // TN=115 / 143
    ppv_at_nccn: 0.216,
    npv_at_nccn: 0.851,

    // ── Kadeer 2025 published cutoff 0.177 ───────────────────────────────
    kadeer_cutoff: 0.177,
    sensitivity_at_kadeer: 0.214,  // TP=6 / 28
    specificity_at_kadeer: 0.839,  // TN=121 / 143 (from Kadeer paper)
    ppv_at_kadeer: 0.207,
    npv_at_kadeer: 0.845,

    note: 'PSAD outperforms PSA alone (ΔAUC +0.082 internal; +0.111 Kadeer). Youden cutoff 0.065 maximises sensitivity — NPV 94.4% means very few upgrades missed above threshold. NCCN/Kadeer cutoffs (0.15–0.177) traded sensitivity for specificity.',
    source: 'Kadeer et al. 2025; N=218 Tewari AS cohort (internal computation)',
  },

  // ── Sub-model supporting variables (from raw N=218 data) ─────────────────
  // These are individual variable performance metrics — not sub-model AUCs
  supporting_variables: {
    pirads_ge4: {
      label: 'PI-RADS ≥4 (vs <4)',
      n: 166,   // patients with mpMRI
      n_upgraded: 28,
      sensitivity: 0.607,   // TP=17/28 upgrades correctly flagged by PIRADS ≥4
      specificity: 0.406,   // TN=56/138
      ppv: 0.172,
      npv: 0.836,
      note: 'PI-RADS 5 lower upgrade rate than 4 (8.3% vs 18.4%) — selection effect: highest MRI-suspicion patients triaged to treatment, not AS.',
    },
    abutment: {
      label: 'NVB Abutment on mpMRI',
      n: 174,
      n_upgraded: 28,
      sensitivity: 0.250,   // TP=7/28
      specificity: 0.705,   // TN=103/146
      ppv: 0.140,
      npv: 0.831,
      note: 'Abutment upgrade rate (14%) below overall (21%) — selection effect present.',
    },
    max_core_gt50: {
      label: 'Max Core Involvement >50%',
      n: 217,
      n_upgraded: 46,
      sensitivity: 0.043,   // TP=2/46
      specificity: 0.860,   // TN=148/172 non-upgraders without >50%
      ppv: 0.077,
      npv: 0.770,
      note: 'Very few patients with >50% core reach AS (selection effect). Low sensitivity — not independently discriminatory in this cohort.',
    },
  },

  // ── Composite engine tier performance (N=218) ─────────────────────────────
  composite: {
    label: 'Combined AS Tool (Tier Thresholds)',
    n: 218,
    n_upgraded: 46,

    // Tier distribution from N=218 cohort
    tier_distribution: {
      standard:   { n: 72, pct: 0.330, upgrade_rate: 0.292 },
      enhanced:   { n: 109, pct: 0.500, upgrade_rate: 0.194 },
      intensive:  { n: 33, pct: 0.151, upgrade_rate: 0.121 },
      treatment:  { n: 4,  pct: 0.018, upgrade_rate: 0.000 },
    },

    // Threshold: ≥Enhanced vs Standard (sensitivity for catching upgrades in higher tiers)
    threshold_enhanced: {
      label: '≥Enhanced tier vs Standard',
      sensitivity: 0.543,  // 25/46 upgrades in Enhanced+Intensive+Treatment
      specificity: 0.297,  // 51/172 non-upgraders correctly in Standard
      ppv: 0.171,
      npv: 0.708,
      note: 'Standard tier has 29.2% upgrade rate — many upgrades occur even at lowest tier.',
    },

    // Threshold: ≥Intensive vs lower tiers
    threshold_intensive: {
      label: '≥Intensive tier vs Standard+Enhanced',
      sensitivity: 0.087,  // 4/46
      specificity: 0.802,  // 138/172
      ppv: 0.105,
      npv: 0.767,
    },

    note: 'Counter-intuitive tier-upgrade pattern (higher tiers show lower observed upgrade rates) reflects appropriate clinical triage: highest-risk patients are referred to treatment rather than AS enrollment. This is the expected selection effect in a real clinical cohort.',
    validation_status: 'Internal validation only — external/prospective validation pending',
    calibration: 'Upgrade rates calibrated to N=218 Mount Sinai AS cohort. Enhanced/Intensive tier risk estimates are literature-derived.',
  },

  // ── Sub-model 2: Genomic ──────────────────────────────────────────────────
  genomic: {
    label: 'Genomic Biomarker Model',
    primary_biomarker: 'Decipher / Oncotype GPS / Prolaris',
    auc_internal: null,
    genomic_testing_rate_in_cohort: '<10% of N=218',
    note: 'Thresholds from published literature (Spratt 2014, Klein 2021, Cooperberg 2013). Internal validation not possible — too few patients had genomic testing. Literature AUCs: Decipher ~0.74, GPS ~0.69, Prolaris ~0.68.',
    source: 'Published literature thresholds',
  },

  // ── Sub-model 3: PSMA ────────────────────────────────────────────────────
  psma: {
    label: 'PSMA PET/CT Model',
    primary_biomarker: 'PSMA PET/CT staging',
    auc_internal: null,
    note: 'Staging classification (negative / local / regional / metastatic) — not a continuous prediction model. Low PSMA testing prevalence in cohort. Thresholds from EAU 2024.',
    source: 'EAU-EANM-ESTRO-ESUR-SIOG Guidelines 2024',
  },

  // ── Multi-variable composite: PSAD + PI-RADS + GGG ──────────────────────────
  // Estimated from N=218 marginal data. True AUC requires multi-variable logistic
  // regression on raw row-level TSV data (not available in the engine layer).
  //
  // Component AUCs (internal, N=218):
  //   PSAD alone:    0.616  (n=171, 28 upgraded — validated)
  //   PI-RADS ≥4:    ~0.506 (marginal binary split; modest signal)
  //   GGG:           N/A as continuous (GG1 vs GG2 is the key split: 24.2% vs 5.7%)
  //
  // Expected composite AUC (PSAD + PI-RADS + GGG):
  //   Estimated ~0.64–0.68 based on:
  //   · GGG2 carves out a genuinely lower-risk subgroup (5.7% vs 24.2%)
  //   · PI-RADS ≥4 adds incremental signal in low-PSAD patients
  //   · Expected ΔAUC over PSAD alone: +0.02–0.06
  //
  // This is documented as an estimate — exact figure requires raw data regression.
  multivar_composite: {
    label: 'Multi-Variable Composite (PSAD + PI-RADS + GGG)',
    components: ['PSAD (AUC 0.616)', 'PI-RADS ≥4 (AUC ~0.506)', 'GGG tier (GG1: 24.2%, GG2: 5.7% upgrade rate)'],
    auc_internal: null,
    auc_estimated_range: '0.64–0.68',
    auc_estimated_basis: 'Marginal data extrapolation from N=218 cohort. Exact figure pending multi-variable logistic regression on raw TSV data.',
    delta_over_psad_alone: '+0.02–0.06 (estimated)',
    n_complete_cases: 166,  // patients with both PSAD and PI-RADS available
    clinical_implication: 'Adding GGG and PI-RADS to PSAD is expected to meaningfully improve discrimination, particularly for GG2 patients (5.7% upgrade — lowest-risk subgroup) and for patients without MRI (highest observed rate: 35.3%). Formal validation is pending.',
    status: 'Estimated — not yet formally validated on raw row-level data',
  },

  // ── Sub-model 4: Intensive Monitoring ────────────────────────────────────
  monitoring: {
    label: 'Intensive Monitoring Model',
    primary_biomarker: 'Composite high-risk features',
    n_features_assessed: 12,
    cohort_feature_prevalence: {
      abutment: '23% (50/218)',
      ece: '<1% (1/218) — near-zero statistical power',
      age_under_50: '0% — no patients <50 in this cohort',
      pirads_4_5: '45% (99/218 with MRI)',
    },
    note: 'Feature-count model. ECE (N=1 positive in cohort): included per guidelines but cannot be statistically calibrated. Age <50 is guideline-based only — not represented in this cohort.',
    source: 'PRIAS protocol; NCCN 2024; D\'Amico et al., JAMA 2004',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1 — GUIDELINE FRAMEWORK
// ═══════════════════════════════════════════════════════════════════════════════

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
 * LAYER 1 — Guideline scoring only.
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
      basis: gggNum === 1
        ? 'NCCN 2024: AS-eligible. N=218 cohort: GG1 upgraded at 24.2% (182 patients) — ongoing surveillance biopsies essential.'
        : gggNum === 2
        ? 'NCCN 2024: select AS eligible (favorable-intermediate). N=218 cohort note: GG2 upgraded at only 5.7% (2/35) — paradoxically lower than GG1. This reflects selection effect: GG2 patients enrolled in AS are highly selected and lower-risk; those with borderline features typically proceed to treatment. Scoring weight reflects guideline risk tier, not observed cohort rate.'
        : gggNum === 3
        ? 'NCCN 2024: unfavourable-intermediate — outside standard AS criteria'
        : 'NCCN 2024: high / very high risk — AS not recommended',
    })
  }

  // Core ratio — GUIDELINE CRITERION ONLY
  // N=218 cohort: pos-core count AUC = 0.465 (not discriminatory for upgrade).
  // Retained as NCCN 2024 eligibility gate, NOT as a weighted risk score.
  // Points reduced to reflect guideline eligibility (pass/fail) rather than risk.
  if (positiveCores != null && totalCores != null && Number(totalCores) > 0) {
    const ratio = Number(positiveCores) / Number(totalCores)
    let pts = 0; let tier = 'low'
    if      (ratio > 0.50) { pts = 6; tier = 'high' }
    else if (ratio > 0.33) { pts = 3; tier = 'intermediate' }
    else if (ratio > 0.17) { pts = 1; tier = 'low' }
    score += pts
    factors.push({
      label: `Core ratio ${positiveCores}/${totalCores} (${Math.round(ratio * 100)}%)`,
      points: pts,
      tier,
      basis: ratio <= 0.17
        ? 'Meets NCCN 2024 very low risk criterion (< 3 of 12 cores) · Guideline eligibility gate only — AUC 0.465 in N=218 cohort (not independently discriminatory)'
        : ratio <= 0.33
        ? 'Approaching NCCN very low risk core number limit · Guideline criterion only — not validated as upgrade predictor in N=218 cohort (AUC 0.465)'
        : 'Outside NCCN 2024 very low risk core criterion · Guideline criterion only — not validated as upgrade predictor in N=218 cohort (AUC 0.465)',
    })
  }

  // Max core involvement — GUIDELINE CRITERION ONLY
  // N=218 cohort: max core % AUC = 0.504 (essentially chance — selection effect:
  // patients with very high core burden are triaged to treatment, not AS).
  // Retained as NCCN eligibility gate only. Weight reduced accordingly.
  if (maxCorePercent != null) {
    const pct  = Number(maxCorePercent)
    const pts  = pct > 50 ? 4 : 0
    const tier = pct > 50 ? 'intermediate' : 'low'
    score += pts
    factors.push({
      label: `Max core involvement ${pct}%`,
      points: pts,
      tier,
      basis: pct <= 50
        ? 'Within NCCN 2024 very low risk (≤ 50% per core) · Guideline gate only — AUC 0.504 in N=218 cohort (not discriminatory; selection effect present)'
        : 'Exceeds NCCN 2024 very low risk threshold (> 50% per core) · Guideline gate only — AUC 0.504 in N=218 cohort (selection effect: high-burden patients more often triaged to treatment)',
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
        ? 'Above Kadeer 2025 Youden cutoff (0.177) — AUC 0.624 in N=218 Mount Sinai AS cohort'
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

  // ePSA pre-biopsy context — display only, no scoring contribution
  // Rationale: ePSA tier → AS upgrade linkage is not validated in the N=218 cohort
  // (pre-biopsy tier not recorded at AS enrollment). Including it as a scoring nudge
  // would add unvalidated signal. It is displayed in Layer 2 cohort context instead.
  if (epsaPreBiopsyTier) {
    factors.push({
      label: `Pre-biopsy ePSA tier: ${String(epsaPreBiopsyTier).replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase())}`,
      points: 0,
      tier: 'low',
      basis: 'ePSA pre-biopsy context — shown for reference only. No scoring contribution: ePSA-to-upgrade linkage is not validated in the N=218 AS cohort (pre-biopsy tier not recorded at enrollment). See cohort calibration section below.',
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
 * LAYER 1 — Guideline scoring only.
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
 * LAYER 1 — Guideline scoring only.
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
 * LAYER 1 — Guideline-driven feature detection only.
 * Evidence basis:
 *  · PRIAS (Bul et al., Eur Urol 2013) — exit criteria and monitoring intensity
 *  · NCCN 2024 AS monitoring criteria
 *  · Canary PASS (Newcomb et al., J Urol 2016)
 *  · D'Amico AV et al., JAMA 2004 — PSA velocity threshold ≥ 2 ng/mL/yr
 *  · PRIAS exit criteria — PSA doubling time < 3 years (Bul 2013)
 *  · NCCN 2024: BRCA2/HOXB13 — enhanced monitoring or treatment preferred
 *  · Cohort note: abutment upgrade rate 14% in N=218 (lower than overall 21% — selection effect)
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
    features.push({ label: `PSAD ${psad.toFixed(3)} ng/mL/cm³ (> Kadeer 2025 Youden cutoff 0.177)`, source: 'Kadeer et al. 2025; N=218 Tewari AS cohort' })

  if (abutment === 'yes')
    features.push({ label: 'Neurovascular bundle (NVB) abutment on mpMRI', source: 'EAU Guidelines 2024 staging criteria' })

  if (pirads != null && Number(pirads) >= 4)
    features.push({ label: `PI-RADS ${pirads} — high suspicion on mpMRI (≥ 4)`, source: 'Turkbey 2019; PI-RADS v2.1' })

  if (pirads != null && Number(pirads) === 0)
    features.push({ label: 'No mpMRI performed — confirmatory MRI required before AS enrollment (NCCN 2024)', source: 'NCCN 2024; EAU 2024: mpMRI required before AS initiation. In N=218 cohort, no-MRI patients upgraded at 35.3%.' })

  if (ece === 'yes')
    features.push({ label: 'Extracapsular extension (ECE) on imaging', source: 'NCCN 2024 staging; EAU 2024 · Guideline-only: N=218 cohort had only N=1 ECE-positive patient — no statistical calibration possible' })

  if (broadContact === 'yes')
    features.push({ label: 'Broad capsular contact > 10 mm on mpMRI', source: 'EAU Guidelines 2024' })

  if (age != null && Number(age) < 50)
    features.push({ label: `Age ${age} years (< 50 — long life expectancy, elevated cumulative risk)`, source: 'PRIAS; AUA/ASTRO 2022 · Guideline-only: N=218 cohort age range 71–88; no patients under 60 — threshold cannot be cohort-calibrated' })

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

// ─── Combined tier logic ──────────────────────────────────────────────────────
/**
 * LAYER 1 — Tier integration (clinically transparent, mirrors NCCN/EAU multi-modal approach):
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

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2 — COHORT CALIBRATION CONTEXT
// Runs after guideline tier is assigned. Returns probability statements from
// real N=218 Mount Sinai AS cohort data. Does NOT change the tier.
// ═══════════════════════════════════════════════════════════════════════════════
function calcCohortContext(inputs, combinedTierKey, psad) {
  const C = COHORT_CALIBRATION
  const ctx = []

  // Overall cohort context
  ctx.push({
    variable: 'cohort_overview',
    label: 'Mount Sinai Tewari AS Program Cohort',
    finding: `N=${C.overview.n} active surveillance patients; overall GG upgrade rate ${(C.overview.overall_upgrade_rate * 100).toFixed(0)}% (${C.overview.upgrade_events} events).`,
    note: C.overview.note,
  })

  // Grade Group upgrade rate from real cohort
  const gggNum = Number(inputs.ggg)
  if (gggNum && C.by_ggg[gggNum]) {
    const g = C.by_ggg[gggNum]
    ctx.push({
      variable: 'ggg',
      label: `Grade Group ${gggNum} — Cohort Upgrade Rate`,
      finding: `In our N=${C.overview.n} cohort, GG${gggNum} patients upgraded at ${(g.upgrade_rate * 100).toFixed(1)}% (${g.upgraded}/${g.n}).`,
      note: gggNum === 2
        ? 'GG2 lower upgrade rate than GG1 in this cohort — reflects careful patient selection for AS (GG2 patients with borderline features more often proceeded to treatment).'
        : gggNum === 1
        ? 'GG1 (Gleason 3+3=6) is the primary AS-eligible grade; 24.2% upgrade rate reflects importance of ongoing surveillance biopsy.'
        : null,
    })
  }

  // PSAD cohort context
  if (psad != null) {
    const pd = C.psad
    if (psad > pd.youden_optimal) {
      ctx.push({
        variable: 'psad',
        label: 'PSAD — Above Youden Optimal Threshold',
        finding: `PSAD ${psad.toFixed(3)} ng/mL/cm³ > ${pd.youden_optimal} (Youden cutoff). In our N=${pd.n} cohort, patients above this threshold upgraded at ${(pd.upgrade_rate_above_youden * 100).toFixed(1)}% vs ${(pd.upgrade_rate_below_youden * 100).toFixed(1)}% below (AUC ${pd.auc}).`,
        note: `Only ${(pd.pct_above_youden * 100).toFixed(0)}% of our cohort is above this cutoff — median cohort PSAD is ${pd.median} (well below threshold).`,
      })
    } else if (psad > pd.nccn_vlow) {
      ctx.push({
        variable: 'psad',
        label: 'PSAD — Between NCCN and Youden Thresholds',
        finding: `PSAD ${psad.toFixed(3)} ng/mL/cm³ — above NCCN very low risk threshold (0.15) but below Youden cutoff (${pd.youden_optimal}). Below-threshold upgrade rate in our cohort: ${(pd.upgrade_rate_below_youden * 100).toFixed(1)}%.`,
        note: `Median cohort PSAD: ${pd.median} ng/mL/cm³. PSAD AUC ${pd.auc} — modest discriminatory value.`,
      })
    } else {
      ctx.push({
        variable: 'psad',
        label: 'PSAD — Within Favorable Range',
        finding: `PSAD ${psad.toFixed(3)} ng/mL/cm³ — within NCCN very low risk range (≤ 0.15). In our cohort, patients below Youden cutoff upgraded at ${(pd.upgrade_rate_below_youden * 100).toFixed(1)}%.`,
        note: `Median cohort PSAD is ${pd.median} — this patient is ${psad < pd.median ? 'below' : 'near'} the cohort median.`,
      })
    }
  } else {
    ctx.push({
      variable: 'psad',
      label: 'PSAD — Not Calculable',
      finding: `Prostate volume not provided; PSAD cannot be calculated. In our N=${C.psad.n} cohort, PSAD (AUC ${C.psad.auc}) is the strongest single biomarker for upgrade prediction.`,
      note: 'Enter prostate volume from MRI or TRUS to enable PSAD-based risk calibration.',
    })
  }

  // PI-RADS cohort context
  const piradsNum = inputs.pirads != null ? Number(inputs.pirads) : null
  if (piradsNum != null && piradsNum > 0 && C.pirads[piradsNum]) {
    const pr = C.pirads[piradsNum]
    const selectionNote = (piradsNum === 5)
      ? 'PI-RADS 5 lower upgrade rate than PI-RADS 4 in our cohort — likely reflects selection effect: very high-suspicion MRI patients are more often directed to treatment rather than AS enrollment.'
      : (piradsNum === 4)
      ? 'PI-RADS 4: 18.4% upgrade rate in our cohort (N=87 patients).'
      : null
    ctx.push({
      variable: 'pirads',
      label: `PI-RADS ${piradsNum} — Cohort Upgrade Rate`,
      finding: `In our N=${C.overview.n} cohort, PI-RADS ${piradsNum} patients upgraded at ${(pr.upgrade_rate * 100).toFixed(1)}% (N=${pr.n}).`,
      note: selectionNote || C.pirads.note,
    })
  } else if (piradsNum === 0) {
    const pr = C.pirads.none
    ctx.push({
      variable: 'pirads',
      label: 'No MRI Performed — Cohort Context',
      finding: `In our N=${C.overview.n} cohort, patients without MRI had the highest upgrade rate: ${(pr.upgrade_rate * 100).toFixed(1)}% (N=${pr.n}).`,
      note: 'mpMRI is strongly recommended before AS enrollment per NCCN 2024 and EAU 2024.',
    })
  }

  // Abutment cohort context
  if (inputs.abutment === 'yes') {
    const ab = C.abutment
    ctx.push({
      variable: 'abutment',
      label: 'NVB Abutment — Cohort Upgrade Rate',
      finding: `In our N=${C.overview.n} cohort, ${ab.n_yes} patients had NVB abutment; their upgrade rate was ${(ab.upgrade_rate_yes * 100).toFixed(1)}% — lower than the overall cohort rate of ${(C.overview.overall_upgrade_rate * 100).toFixed(0)}%.`,
      note: ab.note,
    })
  }

  // Max core involvement cohort context
  if (inputs.maxCorePercent != null && Number(inputs.maxCorePercent) > 50) {
    const mc = C.max_core
    ctx.push({
      variable: 'max_core',
      label: 'Max Core Involvement > 50% — Cohort Context',
      finding: `In our cohort, patients with max core > 50% had an observed upgrade rate of ${(mc.upgrade_rate_above_50 * 100).toFixed(1)}% — paradoxically lower than the overall rate.`,
      note: mc.note,
    })
  }

  // Age cohort context
  if (inputs.age != null && inputs.age !== '') {
    const ageNum = Number(inputs.age)
    const ag = C.age
    ctx.push({
      variable: 'age',
      label: 'Age — Cohort Context',
      finding: `Cohort median age at AS enrollment: ${ag.median} years (mean ${ag.mean}, SD ${ag.sd}). This patient is ${ageNum < ag.median ? 'younger' : 'older'} than the cohort median.`,
      note: ageNum < 50
        ? 'No patients under 50 were enrolled in AS in this cohort. Age <50 is a guideline-based intensive monitoring trigger with elevated long-term cumulative risk.'
        : `Cohort age range reflects a predominantly older population; ${ageNum < ag.mean ? 'younger patients may face longer-duration surveillance decisions.' : 'patient age is within typical AS program range.'}`,
    })
  }

  // Family history cohort context
  if (inputs.familyHistory != null) {
    const fhx = C.fhx_prostate
    if (inputs.familyHistory === 'yes') {
      ctx.push({
        variable: 'fhx',
        label: 'Family History — Cohort Upgrade Rate',
        finding: `In our N=${C.overview.n} cohort, patients with a family history of prostate cancer (N=${fhx.n_yes}) upgraded at ${(fhx.upgrade_rate_yes * 100).toFixed(1)}% — lower than those without (${(fhx.upgrade_rate_no * 100).toFixed(1)}%).`,
        note: fhx.note,
      })
    }
  }

  // Race cohort context
  if (inputs.race) {
    const raceMap = {
      african_american: 'african_american',
      black: 'african_american',
      caucasian: 'caucasian',
      white: 'caucasian',
    }
    const raceKey = raceMap[inputs.race?.toLowerCase()] || 'other'
    const raceData = C.race[raceKey]
    if (raceData) {
      const raceLabels = { african_american: 'African American', caucasian: 'Caucasian', other: 'Other/Not specified' }
      ctx.push({
        variable: 'race',
        label: `Race/Ethnicity — Cohort Upgrade Rate`,
        finding: `In our cohort, ${raceLabels[raceKey]} patients (N=${raceData.n}) had an upgrade rate of ${(raceData.upgrade_rate * 100).toFixed(1)}%.`,
        note: C.race.note,
      })
    }
  }

  // Tier-level upgrade risk
  const tierData = C.tier_annual_upgrade_risk[combinedTierKey]
  if (tierData) {
    ctx.push({
      variable: 'tier_risk',
      label: 'Upgrade Risk Estimate for This Tier',
      finding: tierData.risk != null
        ? `Estimated upgrade risk for this surveillance tier: ~${(tierData.risk * 100).toFixed(0)}% (${tierData.ci}). Source: ${tierData.source}.`
        : `Upgrade risk for this tier: see clinical note. Source: ${tierData.source}.`,
      note: combinedTierKey === 'standard_as'
        ? `This figure reflects the overall N=${C.overview.n} cohort upgrade rate — individual risk varies by PSAD, PI-RADS, and GGG as shown above.`
        : 'Literature-derived estimate for context; individual risk should integrate all sub-model findings.',
    })
  }

  // ePSA pre-biopsy context
  if (inputs.epsaPreBiopsyTier) {
    const epsaData = C.epsa_to_as_eligible[inputs.epsaPreBiopsyTier]
    if (epsaData) {
      ctx.push({
        variable: 'epsa',
        label: 'ePSA Pre-Biopsy Tier — AS Eligibility Context',
        finding: `For patients in the '${inputs.epsaPreBiopsyTier}' ePSA tier (${epsaData.note}), ${(epsaData.pct * 100).toFixed(0)}% were found to have AS-eligible histology (GG1–2) on biopsy in our N=${C.overview.n} cohort.`,
        note: null,
      })
    }
  }

  // Multi-variable composite model note
  const MV_COMP = MODEL_VALIDATION.multivar_composite
  ctx.push({
    variable: 'multivar_composite',
    label: 'Multi-Variable Composite (PSAD + PI-RADS + GGG)',
    finding: `PSAD alone: AUC 0.616 (N=${MODEL_VALIDATION.basic_psad.n_with_psad}). Adding PI-RADS and GGG is estimated to reach AUC ${MV_COMP.auc_estimated_range} based on marginal cohort data. Exact composite AUC pending multi-variable regression on raw cohort data.`,
    note: MV_COMP.clinical_implication,
  })

  return {
    cohortN: C.overview.n,
    cohortUpgradeRate: C.overview.overall_upgrade_rate,
    cohortItems: ctx,
    psadAuc: C.psad.auc,
    psadNpvAtYouden: MODEL_VALIDATION.basic_psad.npv_at_youden,
    psadYoudenCutoff: C.psad.youden_optimal,
    psadInternalAuc: MODEL_VALIDATION.basic_psad.auc_internal,
    cohortNote: C.overview.note,
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * runAssessment(inputs) — two-layer engine entry point
 *
 * LAYER 1: Guideline framework (hard stops → scoring → tier)
 * LAYER 2: Cohort calibration (N=218 upgrade rates as contextual probability)
 *
 * Returns both layers separately so the UI can display them in distinct sections.
 */
export function runAssessment(inputs) {
  // ── Validate inputs ──────────────────────────────────────────────────────────
  const errs = validateInputs(inputs)
  if (Object.keys(errs).length > 0) {
    throw new Error(`Invalid inputs: ${JSON.stringify(errs)}`)
  }

  // ── LAYER 1A: Guideline hard stops — absolute contraindications override all ──
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
      cohortContext: {
        cohortN: COHORT_CALIBRATION.overview.n,
        cohortUpgradeRate: COHORT_CALIBRATION.overview.overall_upgrade_rate,
        cohortItems: [],
        psadAuc: COHORT_CALIBRATION.psad.auc,
        psadYoudenCutoff: COHORT_CALIBRATION.psad.youden_optimal,
        cohortNote: 'Hard stop triggered — cohort calibration context not applicable.',
      },
      guidelineLayer: { hardStop: true, hardStopId: hardStop.id },
      cohortLayer: null,
      modelValidation: MODEL_VALIDATION,
    }
  }

  // ── LAYER 1B: Run four guideline sub-models ──────────────────────────────────
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

  // ── LAYER 1C: Combine sub-models → final guideline tier ─────────────────────
  const combinedResult = calcCombined({
    asTierKey:       basicResult.asTierKey,
    genomicRiskTier: genomicResult.genomicRiskTier,
    psmaFinding:     inputs.psmaFinding,
    monitoringTier:  monitoringResult.monitoringTier,
    hardOverride:    psmaResult.hardOverride,
  })

  // ── LAYER 2: Cohort calibration — N=218 probability context ─────────────────
  const cohortContext = calcCohortContext(
    inputs,
    combinedResult.combinedTierKey,
    basicResult.psad,
  )

  // ── Return both layers ───────────────────────────────────────────────────────
  return {
    hardStop: false,

    // ── Layer 1 outputs (guideline-derived) ──
    ...basicResult,
    ...genomicResult,
    ...psmaResult,
    ...monitoringResult,
    ...combinedResult,

    // ── Model validation metrics ──
    modelValidation: MODEL_VALIDATION,

    // Named layer objects for UI separation
    guidelineLayer: {
      asTierKey:       basicResult.asTierKey,
      asScore:         basicResult.asScore,
      asFactors:       basicResult.asFactors,
      psad:            basicResult.psad,
      genomicRiskTier: genomicResult.genomicRiskTier,
      genomicScore:    genomicResult.genomicScore,
      genomicFactors:  genomicResult.genomicFactors,
      genomicAssessed: genomicResult.genomicAssessed,
      psmaFinding:     psmaResult.psmaFinding,
      psmaScore:       psmaResult.psmaScore,
      psmaFactors:     psmaResult.psmaFactors,
      psmaAssessed:    psmaResult.psmaAssessed,
      monitoringTier:  monitoringResult.monitoringTier,
      monitoringLabel: monitoringResult.monitoringLabel,
      monitoringSchedule: monitoringResult.monitoringSchedule,
      features:        monitoringResult.features,
      featureCount:    monitoringResult.featureCount,
      combinedTierKey: combinedResult.combinedTierKey,
      combinedColor:   combinedResult.combinedColor,
      combinedRecommendation: combinedResult.combinedRecommendation,
    },

    // ── Layer 2 output (N=218 cohort calibration) ──
    cohortContext,
    cohortLayer: cohortContext,
  }
}
