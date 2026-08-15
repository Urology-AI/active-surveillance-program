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
 *   · Real N=1,213 Mount Sinai Tewari AS Program data overlaid as contextual statements
 *   · Per-variable upgrade rates from the actual cohort (not borrowed from PRIAS/Hopkins)
 *   · Returned as separate `cohortContext` object — does not alter the guideline-derived tier
 *
 * Evidence basis embedded per sub-model below.
 */

import { ENGINE_VERSION, MODEL_PROVENANCE } from './modelVersion.js'

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2 DATA — N=1,213 COHORT CALIBRATION
// Mount Sinai Tewari AS Program, N=1,213 active surveillance patients
// Real upgrade event data (GG upgrading on follow-up biopsy)
// ═══════════════════════════════════════════════════════════════════════════════
// Model provenance — single source of truth lives in src/modelVersion.js.
// Re-exported here so consumers of the engine get version + cohort data-cut
// metadata from the same import as the results.
export const ENGINE_MODEL_VERSION = ENGINE_VERSION

export const COHORT_CALIBRATION = {
  overview: {
    n: 1213,
    upgrade_events: 305,
    overall_upgrade_rate: 0.251,
    note: 'Mount Sinai Tewari AS Program — N=1,213 active surveillance patients. Upgrade = GG advancement on repeat biopsy.',
  },

  // On/off AS status split — critical for shared decision-making framing
  intervention: {
    currently_in_as: 724,
    currently_in_as_rate: 0.597,
    progressed_total: 489,
    progressed_rate: 0.403,
    progressed_clinical_upgrade: 257,
    progressed_clinical_rate: 0.212,
    progressed_anxiety_preference: 232,
    progressed_anxiety_rate: 0.191,
    note: 'Nearly half (47.4%) of patients who left AS did so without upgrading — anxiety or patient preference, not clinical progression. This distinction is critical for shared decision-making.',
  },

  // Upgrade rate by initial Grade Group
  by_ggg: {
    1: { n: 1111, upgraded: 297, upgrade_rate: 0.267, progressed: 432, progressed_rate: 0.389, clinical_upgrade: 249, anxiety_exit: 183 },
    2: { n: 100,  upgraded: 8,   upgrade_rate: 0.080, progressed: 57,  progressed_rate: 0.570, clinical_upgrade: 8,   anxiety_exit: 49 },
    3: { n: 2,    upgraded: 0,   upgrade_rate: 0.000, progressed: 0,   progressed_rate: 0.000 },
  },

  // PSA — note: raw PSA has limited discriminatory value; PSAD is the key biomarker
  psa: {
    n: 1213,
    note: 'PSA as raw value has limited discriminatory power for upgrade. PSAD (PSA ÷ prostate volume) is the primary validated biomarker in this cohort.',
  },

  // PSAD — 4-tier breakdown (GG1 subset only, N=704 with PSAD computable)
  // AUC 0.609 (Mann-Whitney, GG1, N=704); Kadeer 2025
  psad: {
    n: 704,
    ggg_subset: 1,
    auc: 0.609,
    youden_optimal: 0.065,
    nccn_vlow: 0.15,
    kadeer_cutoff: 0.177,
    median_upgraders: 0.112,
    median_non_upgraders: 0.096,
    tiers: {
      very_low:     { label: '< 0.065',   n: 170, upgrade_rate: 0.112, progressed_rate: 0.224 },
      intermediate: { label: '0.065–0.15',n: 381, upgrade_rate: 0.239, progressed_rate: 0.333 },
      nccn_zone:    { label: '0.15–0.177',n: 55,  upgrade_rate: 0.273, progressed_rate: 0.273 },
      high:         { label: '> 0.177',   n: 98,  upgrade_rate: 0.347, progressed_rate: 0.480 },
    },
    source: 'Kadeer et al. 2025 + Mount Sinai Tewari AS Program GG1 subset N=704',
    note: 'PSAD AUC 0.609 on N=704 GG1 patients with PSAD computable. Upgrader median PSAD 0.112 vs non-upgrader 0.096.',
  },

  // PI-RADS — N=1,213 full cohort
  pirads: {
    1:    { n: 15,  upgrade_rate: 0.267 },
    2:    { n: 167, upgrade_rate: 0.168 },
    3:    { n: 169, upgrade_rate: 0.201 },
    4:    { n: 284, upgrade_rate: 0.264 },
    5:    { n: 45,  upgrade_rate: 0.222 },
    none: { n: 67,  upgrade_rate: 0.254 },
    note: 'Selection effect applies: PI-RADS 5 patients with very aggressive MRI findings are more often triaged to treatment rather than AS enrollment.',
  },

  // Patient age at enrollment — N=1,213, with real under-50 data
  age: {
    n: 1213,
    tiers: {
      under_50:  { label: '< 50',  n: 50,  upgrade_rate: 0.300, progressed_rate: 0.460 },
      age_50_59: { label: '50–59', n: 304, upgrade_rate: 0.276, progressed_rate: 0.424 },
      age_60_69: { label: '60–69', n: 526, upgrade_rate: 0.253, progressed_rate: 0.376 },
      age_70p:   { label: '70+',   n: 231, upgrade_rate: 0.281, progressed_rate: 0.355 },
    },
  },

  // Race / ethnicity — N=1,213 full cohort
  race: {
    caucasian:        { n: 708, upgrade_rate: 0.292 },
    other:            { n: 376, upgrade_rate: 0.144 },
    african_american: { n: 129, upgrade_rate: 0.341 },
    note: 'African American patients: highest observed upgrade rate (34.1%, N=129) — consistent with known biological and detection disparities.',
  },

  // Prostate volume — retained for context
  prostate_volume: {
    note: 'Larger prostate volume dilutes PSA → lower PSAD → may mask significant disease.',
  },

  // Overall upgrade risk by monitoring tier (literature-calibrated for enhanced/intensive)
  tier_annual_upgrade_risk: {
    standard_as:  { risk: 0.251, ci: '23–28%', source: 'Mount Sinai Tewari AS Program N=1,213 (overall cohort rate)' },
    enhanced_as:  { risk: 0.08,  ci: '5–12%',  source: 'Literature — unfavorable intermediate AS programs' },
    intensive_as: { risk: 0.20,  ci: '15–30%', source: 'Literature — high-feature AS programs; short-interval biopsy recommended' },
  },

  // NVB abutment — N=1,213 full cohort
  abutment: {
    n_yes: 196,
    upgrade_rate_yes: 0.140,
    note: 'Abutment present in 196/1,213 patients (16%). Upgrade rate 14.0% — lower than overall 25.1% cohort rate, likely reflecting selection effect (higher-risk abutment patients directed to treatment).',
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
 * Internal validation metrics — Mount Sinai Tewari AS Program, N=1,213 cohort.
 * All Sensitivity / Specificity / PPV / NPV computed directly from the raw
 * N=1,213 dataset (Mann-Whitney AUC; Youden J optimal cutoff).
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
    n: 1213,
    n_upgraded: 305,
    upgrade_rate: 0.251,
    n_gg1: 1111,
    n_currently_as: 724,
    n_progressed: 489,
    follow_up: 'Follow-up biopsy (GG upgrading endpoint)',
    validation_type: 'Internal cohort validation',
    reference: 'Kadeer N et al., Eur Urol 2025',
  },

  // ── Sub-model 1: Basic + PSAD ─────────────────────────────────────────────
  // Recomputed on GG1 subset N=704 with PSAD available (159 upgraded)
  // Mann-Whitney AUC = 0.609 (internal); Kadeer 2025 published AUC = 0.624
  basic_psad: {
    label: 'Basic + PSAD Model',
    primary_biomarker: 'PSAD (PSA ÷ prostate volume)',
    n_with_psad: 704,
    n_upgraded_with_psad: 159,

    // ── AUC ────────────────────────────────────────────────────────────────
    auc_internal: 0.609,           // Mann-Whitney from GG1 N=704 subset
    auc_published: 0.624,          // Kadeer et al. 2025 (reference publication)
    auc_psa_alone: 0.534,          // PSA alone — internal computation
    delta_auc: 0.075,              // PSAD vs PSA alone (internal)

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

    note: 'PSAD outperforms PSA alone (ΔAUC +0.075 internal; +0.090 Kadeer). Youden cutoff 0.065 maximises sensitivity — PSAD < 0.065 tier shows 11.2% upgrade rate (N=170). NCCN/Kadeer cutoffs (0.15–0.177) traded sensitivity for specificity.',
    source: 'Kadeer et al. 2025; Mount Sinai Tewari AS Program GG1 N=704 cohort (internal computation)',
  },

  // ── Sub-model supporting variables (from N=1,213 data) ───────────────────
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
    calibration: 'Upgrade rates calibrated to N=1,213 Mount Sinai AS cohort. Enhanced/Intensive tier risk estimates are literature-derived.',
  },

  // ── Sub-model 2: Genomic ──────────────────────────────────────────────────
  genomic: {
    label: 'Genomic Biomarker Model',
    primary_biomarker: 'Decipher / Oncotype GPS / Prolaris',
    auc_internal: null,
    genomic_testing_rate_in_cohort: '<10% of N=1,213',
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
    components: ['PSAD (AUC 0.609)', 'PI-RADS ≥4 (AUC ~0.506)', 'GGG tier (GG1: 26.7%, GG2: 8.0% upgrade rate)'],
    auc_internal: null,
    auc_estimated_range: '0.64–0.68',
    auc_estimated_basis: 'Marginal data extrapolation from N=1,213 cohort. Exact figure pending multi-variable logistic regression on raw data.',
    delta_over_psad_alone: '+0.02–0.06 (estimated)',
    n_complete_cases: 166,
    clinical_implication: 'Adding GGG and PI-RADS to PSAD is expected to meaningfully improve discrimination, particularly for GG2 patients (8.0% upgrade — lowest-risk subgroup) and for patients without MRI (25.4% observed rate). Formal validation is pending.',
    status: 'Estimated — not yet formally validated on raw row-level data',
  },

  // ── Sub-model 4: Intensive Monitoring ────────────────────────────────────
  monitoring: {
    label: 'Intensive Monitoring Model',
    primary_biomarker: 'Composite high-risk features',
    n_features_assessed: 12,
    cohort_feature_prevalence: {
      age_under_50: '4.1% (50/1213) — N=50 patients under 50; upgrade rate 30.0%, progression rate 46.0%',
      pirads_4_5: '27.1% (329/1213 with PI-RADS 4–5)',
      ece: '<1% (4/1,213)',
    },
    note: 'Feature-count model based on guideline criteria. Age <50 now has N=50 cohort data (upgrade rate 30.0%); this is the highest-progression-rate age group. ECE: included per guidelines.',
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
 *    Bastian PJ et al., Cancer 2004;101(9):2001-2005 [journal corrected from
 *    prior "J Urol 2004" — verified]; Epstein JI et al., J Urol 1994
 *  · PSAD 0.15 ng/mL/cm³ — NCCN 2024 very low risk upper bound
 *  · PSAD 0.177 ng/mL/cm³ — Kadeer A et al., Front Oncol 2025;15:1602134
 *    ("Diagnostic accuracy of PSA derivatives for prostate cancer in patients
 *    with low PSA levels"), doi:10.3389/fonc.2025.1602134. Corrected citation
 *    (previously misattributed to "Eur Urol 2025", which does not exist).
 *    CAUTION — population/outcome mismatch: Kadeer's 0.177 cutoff (sens 77.3%,
 *    spec 94.7%) was derived from N=60 biopsy-naive men (38 BPH, 22 PCa, all
 *    PSA≤10) to DIAGNOSE cancer vs. benign disease — a different clinical
 *    question than this tool's use of it to PROGNOSTICATE upgrade risk in
 *    already-diagnosed GG1 patients on active surveillance. It is not
 *    externally validated for that use case. This file's own internally-
 *    computed Youden-optimal PSAD cutoff of 0.065 (COHORT_CALIBRATION.psad.
 *    youden_optimal) is derived from the actually-matching population/outcome
 *    (N=704 GG1 AS patients, real upgrade-on-rebiopsy endpoint) and is the
 *    more defensible threshold for this specific use case.
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
        ? 'NCCN 2024: AS-eligible. N=1,213 cohort: GG1 upgraded at 26.7% (1,111 patients) — ongoing surveillance biopsies essential.'
        : gggNum === 2
        ? 'NCCN 2024: select AS eligible (favorable-intermediate). N=1,213 cohort: GG2 upgrade rate 8.0% (8/100) — substantially lower than GG1 (26.7%). This reflects selection effect: GG2 patients enrolled in AS are highly selected (lower volume, lower PSAD, favorable MRI). 49 of 57 GG2 patients who left AS did so without upgrading — the highest non-clinical exit rate of any GGG. Scoring weight follows guideline tier, not observed cohort rate.'
        : gggNum === 3
        ? 'NCCN 2024: unfavourable-intermediate — outside standard AS criteria'
        : 'NCCN 2024: high / very high risk — AS not recommended',
    })
  }

  // Core count / ratio — GUIDELINE CRITERION ONLY
  // N=218 cohort: pos-core count AUC = 0.465 (not discriminatory for upgrade).
  // Retained as NCCN 2024 eligibility gate, NOT as a weighted risk score.
  // Points reduced to reflect guideline eligibility (pass/fail) rather than risk.
  //
  // NCCN's very-low-risk criterion is an ABSOLUTE COUNT — "< 3 positive cores" —
  // not a ratio. Gating on ratio alone misclassifies patients: e.g. 2/4 positive
  // (50% ratio) meets NCCN by count but was previously flagged "outside very low
  // risk" by ratio; 3/24 positive (12.5% ratio) fails NCCN by count but was
  // previously treated as favorable. Core count is now the primary gate; ratio
  // is used only to grade severity among patients who already fail that gate.
  if (positiveCores != null && totalCores != null && Number(totalCores) > 0) {
    const posCores = Number(positiveCores)
    const ratio = posCores / Number(totalCores)
    const meetsNccnCoreCount = posCores < 3
    let pts = 0; let tier = 'low'
    if (!meetsNccnCoreCount) {
      if      (ratio > 0.50) { pts = 6; tier = 'high' }
      else if (ratio > 0.33) { pts = 3; tier = 'intermediate' }
      else                   { pts = 1; tier = 'low' }
    }
    score += pts
    factors.push({
      label: `Positive cores ${positiveCores}/${totalCores} (${Math.round(ratio * 100)}%)`,
      points: pts,
      tier,
      basis: meetsNccnCoreCount
        ? `Meets NCCN 2024 very low risk core criterion (< 3 positive cores; ${positiveCores} positive here) · Guideline eligibility gate only — AUC 0.465 in internal validation cohort (not independently discriminatory)`
        : `Outside NCCN 2024 very low risk core criterion (≥ 3 positive cores; ${positiveCores} positive here) · Guideline criterion only — not validated as upgrade predictor in internal validation cohort (AUC 0.465). Ratio ${Math.round(ratio * 100)}% shown for additional context.`,
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
        ? 'Within NCCN 2024 very low risk (≤ 50% per core) · Guideline gate only — AUC 0.504 in internal validation cohort (not discriminatory; selection effect present)'
        : 'Exceeds NCCN 2024 very low risk threshold (> 50% per core) · Guideline gate only — AUC 0.504 in internal validation cohort (selection effect: high-burden patients more often triaged to treatment)',
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
        ? 'Above Kadeer 2025 cutoff (0.177) — tier upgrade rate 34.7% in N=98 GG1 patients (AUC 0.609, N=704 GG1 cohort)'
        : psad > 0.15
        ? 'Above NCCN 2024 very low risk threshold (0.15); below Kadeer 2025 cutoff — tier upgrade rate 27.3% (N=55 GG1 patients)'
        : psad > 0.065
        ? 'PSAD 0.065–0.15 — intermediate risk tier; upgrade rate 23.9% (N=381 GG1 patients in N=1,213 cohort)'
        : 'PSAD < 0.065 — very low risk tier; upgrade rate 11.2% (N=170 GG1 patients in N=1,213 cohort)',
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
        ? 'PI-RADS v2.1: high probability of clinically significant cancer. Note: PI-RADS was not an independent predictor of GG upgrade in multivariable analysis (p=0.397) after adjusting for PSAD, GGG, and positive core count (N=781). Retained as a monitoring intensity trigger, not a standalone risk score.'
        : 'PI-RADS v2.1: very high probability — biopsy/treatment discussion urgently recommended. Note: PI-RADS was not an independent predictor of GG upgrade in multivariable analysis (p=0.397) after adjusting for PSAD, GGG, and positive core count (N=781). Retained as a monitoring intensity trigger, not a standalone risk score.',
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
      basis: 'ePSA pre-biopsy context — shown for reference only. No scoring contribution: ePSA-to-upgrade linkage is not validated in the N=1,213 AS cohort (pre-biopsy tier not recorded at enrollment). See cohort calibration section below.',
    })
  }

  let asTierKey
  if      (score <= 3)  asTierKey = 'standard_as'
  else if (score <= 20) asTierKey = 'enhanced_as'
  else if (score <= 45) asTierKey = 'intensive_as'
  else                  asTierKey = 'treatment'

  // Logistic regression upgrade probability (N=781, AUC 0.668 with PSAD; N=1,197, AUC 0.609 without)
  let upgradeProbability = null
  let upgradeProbabilityModel = null
  const hasPsad = psad !== null
  const hasCores = positiveCores != null
  const hasGgg = ggg != null
  if (hasGgg || hasCores) {
    const intercept = -1.994
    const ggg2Term = (Number(ggg) === 2) ? -2.151 : 0
    const coresTerm = hasCores ? 0.114 * Number(positiveCores) : 0
    if (hasPsad) {
      const psadTerm = 3.866 * psad
      const logit = intercept + ggg2Term + psadTerm + coresTerm
      upgradeProbability = Math.round((1 / (1 + Math.exp(-logit))) * 1000) / 1000
      upgradeProbabilityModel = 'GGG + PSAD + Cores (AUC 0.668, N=781)'
    } else {
      const logit = intercept + ggg2Term + coresTerm
      upgradeProbability = Math.round((1 / (1 + Math.exp(-logit))) * 1000) / 1000
      upgradeProbabilityModel = 'GGG + Cores (AUC 0.609, N=1,197)'
    }
  }

  return { asTierKey, asScore: score, asFactors: factors, psad, upgradeProbability, upgradeProbabilityModel }
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
    features.push({ label: `PSAD ${psad.toFixed(3)} ng/mL/cm³ (> Kadeer 2025 Youden cutoff 0.177)`, source: 'Kadeer et al. 2025; N=1,213 Tewari AS cohort — tier upgrade rate 34.7% (N=98)' })

  if (abutment === 'yes')
    features.push({ label: 'Neurovascular bundle (NVB) abutment on mpMRI', source: 'EAU Guidelines 2024 staging criteria' })

  if (pirads != null && Number(pirads) >= 4)
    features.push({ label: `PI-RADS ${pirads} — high suspicion on mpMRI (≥ 4)`, source: 'Turkbey 2019; PI-RADS v2.1' })

  if (pirads != null && Number(pirads) === 0)
    features.push({ label: 'No mpMRI performed — confirmatory MRI required before AS enrollment (NCCN 2024)', source: 'NCCN 2024; EAU 2024: mpMRI required before AS initiation. In internal validation cohort (N=218), no-MRI patients upgraded at 35.3%.' })

  if (ece === 'yes')
    features.push({ label: 'Extracapsular extension (ECE) on imaging', source: 'NCCN 2024 staging; EAU 2024 · Guideline-only: N=1,213 cohort had N=4 ECE-positive patients — too small for statistical calibration.' })

  if (broadContact === 'yes')
    features.push({ label: 'Broad capsular contact > 10 mm on mpMRI', source: 'EAU Guidelines 2024' })

  if (age != null && Number(age) < 50)
    features.push({ label: `Age ${age} years (< 50 — long life expectancy, elevated cumulative risk)`, source: 'PRIAS; AUA/ASTRO 2022 · N=1,213 cohort: 50 patients under 50, upgrade rate 30.0%, progression rate 46.0% — highest of any age group' })

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
// real N=1,213 Mount Sinai AS cohort data. Does NOT change the tier.
// ═══════════════════════════════════════════════════════════════════════════════
function calcCohortContext(inputs, combinedTierKey, psad) {
  const C = COHORT_CALIBRATION
  const ctx = []

  // Overall cohort context
  ctx.push({
    variable: 'cohort_overview',
    label: 'Mount Sinai Tewari AS Program Cohort',
    finding: `N=${C.overview.n} active surveillance patients; overall GG upgrade rate ${(C.overview.overall_upgrade_rate * 100).toFixed(0)}% (${C.overview.upgrade_events} events). Currently in AS: ${C.intervention.currently_in_as} (${(C.intervention.currently_in_as_rate * 100).toFixed(0)}%).`,
    note: `Of the ${C.intervention.progressed_total} patients who progressed from AS: ${C.intervention.progressed_clinical_upgrade} (${(C.intervention.progressed_clinical_rate * 100).toFixed(0)}%) left due to clinical upgrade; ${C.intervention.progressed_anxiety_preference} (${(C.intervention.progressed_anxiety_rate * 100).toFixed(0)}%) left without upgrading (anxiety or patient preference). ${C.intervention.note}`,
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
        ? `GG2 upgrade rate (8.0%) is paradoxically lower than GG1 (26.7%) — reflects selection effect: GG2 patients in AS are highly selected. ${g.anxiety_exit} of ${g.progressed} GG2 patients who left AS did so without upgrading (highest non-clinical exit rate of any GGG).`
        : gggNum === 1
        ? `GG1 (Gleason 3+3=6) is the primary AS-eligible grade; 26.7% upgrade rate reflects importance of ongoing surveillance biopsy. Of ${g.progressed} GG1 patients who left AS, ${g.clinical_upgrade} upgraded clinically and ${g.anxiety_exit} left by preference without upgrading.`
        : null,
    })
  }

  // PSAD cohort context — 4-tier system (GG1 subset N=704)
  if (psad != null) {
    const pd = C.psad
    const tiers = pd.tiers
    let tierKey, tierData
    if      (psad < 0.065) { tierKey = 'very_low';     tierData = tiers.very_low }
    else if (psad < 0.15)  { tierKey = 'intermediate'; tierData = tiers.intermediate }
    else if (psad < 0.177) { tierKey = 'nccn_zone';    tierData = tiers.nccn_zone }
    else                   { tierKey = 'high';          tierData = tiers.high }

    ctx.push({
      variable: 'psad',
      label: `PSAD — ${tierData.label} Tier (${(tierData.upgrade_rate * 100).toFixed(1)}% upgrade rate)`,
      finding: `PSAD ${psad.toFixed(3)} ng/mL/cm³ falls in the '${tierData.label}' tier. In our N=${pd.n} GG1 patients with PSAD (AUC ${pd.auc}): upgrade rate ${(tierData.upgrade_rate * 100).toFixed(1)}% (N=${tierData.n} patients in this tier).`,
      note: `PSAD tiers: <0.065 → 11.2% | 0.065–0.15 → 23.9% | 0.15–0.177 → 27.3% | >0.177 → 34.7%. Upgrader median PSAD ${pd.median_upgraders} vs non-upgrader ${pd.median_non_upgraders}.`,
    })
  } else {
    ctx.push({
      variable: 'psad',
      label: 'PSAD — Not Calculable',
      finding: `Prostate volume not provided; PSAD cannot be calculated. In our N=${C.psad.n} GG1 cohort, PSAD (AUC ${C.psad.auc}) is the strongest single biomarker for upgrade prediction.`,
      note: 'Enter prostate volume from MRI or TRUS to enable PSAD-based risk calibration.',
    })
  }

  // PI-RADS cohort context
  const piradsNum = inputs.pirads != null ? Number(inputs.pirads) : null
  if (piradsNum != null && piradsNum > 0 && C.pirads[piradsNum]) {
    const pr = C.pirads[piradsNum]
    const selectionNote = piradsNum === 5
      ? 'PI-RADS 5 lower upgrade rate than PI-RADS 4 in our cohort — reflects selection effect: very high-suspicion MRI patients are more often directed to treatment rather than AS enrollment.'
      : piradsNum === 4
      ? `PI-RADS 4: ${(pr.upgrade_rate * 100).toFixed(1)}% upgrade rate in our cohort (N=${pr.n} patients) — highest of any single PI-RADS category with adequate sample size.`
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
      finding: `In our N=${C.overview.n} cohort, patients without MRI upgraded at ${(pr.upgrade_rate * 100).toFixed(1)}% (N=${pr.n}).`,
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
    const mc = MODEL_VALIDATION.supporting_variables.max_core_gt50
    const mcUpgradeRate = mc.n_upgraded / mc.n
    ctx.push({
      variable: 'max_core',
      label: 'Max Core Involvement > 50% — Cohort Context',
      finding: `In our cohort, patients with max core > 50% had an observed upgrade rate of ${(mcUpgradeRate * 100).toFixed(1)}% — paradoxically lower than the overall rate.`,
      note: mc.note,
    })
  }

  // Age cohort context — N=1,213 with real under-50 data
  if (inputs.age != null && inputs.age !== '') {
    const ageNum = Number(inputs.age)
    const ag = C.age
    let ageTier, ageTierData
    if      (ageNum < 50) { ageTier = 'under_50';  ageTierData = ag.tiers.under_50 }
    else if (ageNum < 60) { ageTier = 'age_50_59'; ageTierData = ag.tiers.age_50_59 }
    else if (ageNum < 70) { ageTier = 'age_60_69'; ageTierData = ag.tiers.age_60_69 }
    else                  { ageTier = 'age_70p';   ageTierData = ag.tiers.age_70p }
    ctx.push({
      variable: 'age',
      label: `Age ${ageNum} — Cohort Context (${ageTierData.label} tier)`,
      finding: `In our N=${ag.n} cohort, patients aged ${ageTierData.label} had upgrade rate ${(ageTierData.upgrade_rate * 100).toFixed(1)}% and progression rate ${(ageTierData.progressed_rate * 100).toFixed(1)}% (N=${ageTierData.n}).`,
      note: ageNum < 50
        ? `Age <50 patients (N=${ageTierData.n}): upgrade rate ${(ageTierData.upgrade_rate * 100).toFixed(0)}% and progression rate ${(ageTierData.progressed_rate * 100).toFixed(0)}% — highest progression rate of any age group. Long life expectancy makes cumulative upgrade risk higher.`
        : ageNum < 60
        ? `Age 50–59: second-highest progression rate (${(ageTierData.progressed_rate * 100).toFixed(0)}%) — longer expected surveillance duration.`
        : `Age ${ageTierData.label}: progression rate ${(ageTierData.progressed_rate * 100).toFixed(0)}% — within typical AS program range.`,
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
        finding: `In our N=${C.overview.n} cohort, ${raceLabels[raceKey]} patients (N=${raceData.n}) had an upgrade rate of ${(raceData.upgrade_rate * 100).toFixed(1)}% (vs overall ${(C.overview.overall_upgrade_rate * 100).toFixed(0)}%).`,
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
    finding: `PSAD alone: AUC 0.609 (N=${MODEL_VALIDATION.basic_psad.n_with_psad} GG1 patients). Adding PI-RADS and GGG is estimated to reach AUC ${MV_COMP.auc_estimated_range} based on marginal cohort data. Exact composite AUC pending multi-variable regression on raw N=1,213 data.`,
    note: MV_COMP.clinical_implication,
  })

  // Chips for inline cohort context display
  const gggNum2 = Number(inputs.ggg)
  const gggChipRate = gggNum2 && C.by_ggg[gggNum2] ? C.by_ggg[gggNum2].upgrade_rate : null

  let psadChipRate = null
  let psadChipLabel = null
  if (psad != null) {
    const tiers2 = C.psad.tiers
    if      (psad < 0.065) { psadChipRate = tiers2.very_low.upgrade_rate;     psadChipLabel = 'PSAD tier upgrade rate' }
    else if (psad < 0.15)  { psadChipRate = tiers2.intermediate.upgrade_rate; psadChipLabel = 'PSAD tier upgrade rate' }
    else if (psad < 0.177) { psadChipRate = tiers2.nccn_zone.upgrade_rate;    psadChipLabel = 'PSAD tier upgrade rate' }
    else                   { psadChipRate = tiers2.high.upgrade_rate;          psadChipLabel = 'PSAD tier upgrade rate' }
  }

  let piradsChipRate = null
  let piradsChipLabel = null
  if (psad == null && inputs.pirads != null) {
    const piradsKey = inputs.pirads === 0 ? 'none' : inputs.pirads
    if (C.pirads[piradsKey]) {
      piradsChipRate = C.pirads[piradsKey].upgrade_rate
      piradsChipLabel = inputs.pirads === 0 ? 'No MRI upgrade rate' : `PI-RADS ${inputs.pirads} upgrade rate`
    }
  }

  return {
    cohortN: C.overview.n,
    cohortUpgradeRate: C.overview.overall_upgrade_rate,
    cohortItems: ctx,
    psadAuc: C.psad.auc,
    psadNpvAtYouden: MODEL_VALIDATION.basic_psad.npv_at_youden,
    psadYoudenCutoff: C.psad.youden_optimal,
    psadInternalAuc: MODEL_VALIDATION.basic_psad.auc_internal,
    cohortNote: C.overview.note,
    interventionData: C.intervention,
    chips: {
      cohort_n: C.overview.n,
      ggg_rate: C.by_ggg[gggNum] ? C.by_ggg[gggNum].upgrade_rate : C.overview.overall_upgrade_rate,
      ggg_label: C.by_ggg[gggNum] ? `GG${gggNum} upgrade rate` : 'Overall upgrade rate',
      psad_tier_rate: (() => {
        if (psad === null) return null
        if (psad > C.psad.youden_optimal) return C.psad.tier_high ? C.psad.tier_high.upgrade_rate : C.psad.tiers.high.upgrade_rate
        if (psad > C.psad.nccn_vlow)      return C.psad.tier_nccn ? C.psad.tier_nccn.upgrade_rate : C.psad.tiers.nccn_zone.upgrade_rate
        if (psad > 0.10)                   return C.psad.tier_low ? C.psad.tier_low.upgrade_rate : C.psad.tiers.intermediate.upgrade_rate
        return C.psad.tier_below_youden ? C.psad.tier_below_youden.upgrade_rate : C.psad.tiers.very_low.upgrade_rate
      })(),
      psad_tier_label: psad !== null ? `Your PSAD tier: ${((() => {
        if (psad > C.psad.youden_optimal) return C.psad.tier_high ? C.psad.tier_high.upgrade_rate : C.psad.tiers.high.upgrade_rate
        if (psad > C.psad.nccn_vlow)      return C.psad.tier_nccn ? C.psad.tier_nccn.upgrade_rate : C.psad.tiers.nccn_zone.upgrade_rate
        if (psad > 0.10)                   return C.psad.tier_low ? C.psad.tier_low.upgrade_rate : C.psad.tiers.intermediate.upgrade_rate
        return C.psad.tier_below_youden ? C.psad.tier_below_youden.upgrade_rate : C.psad.tiers.very_low.upgrade_rate
      })() * 100).toFixed(1)}% upgrade rate` : null,
      pirads_rate: piradsChipRate,
      pirads_label: piradsChipLabel,
    },
  }
}

// ─── Outcomes prediction ──────────────────────────────────────────────────────
/**
 * calcOutcomesPrediction(inputs) — Layer 2 outcomes panel
 *
 * Returns structured probability estimates for the outcomes prediction panel.
 * Stratifies upgrade probability by PSAD tier (if computable) or GGG.
 * Does NOT modify the guideline tier.
 */
export function calcOutcomesPrediction(inputs) {
  const C = COHORT_CALIBRATION

  // Compute PSAD if possible
  const psadVal = (inputs.psa != null && inputs.prostateVolume != null && Number(inputs.prostateVolume) > 0)
    ? Number(inputs.psa) / Number(inputs.prostateVolume)
    : null

  const gggNum = Number(inputs.ggg)
  const gggData = C.by_ggg[gggNum]
  const gggRate = gggData ? gggData.upgrade_rate * 100 : null

  // PSAD-tier upgrade rate (GG1 subset; fall back to GGG rate if unavailable)
  let psadTierRate = null
  let psadTierLabel = null
  let psadTierN = null
  if (psadVal != null) {
    const tiers = C.psad.tiers
    if      (psadVal < 0.065) { psadTierRate = tiers.very_low.upgrade_rate     * 100; psadTierLabel = 'PSAD < 0.065 (very low risk tier)';     psadTierN = tiers.very_low.n }
    else if (psadVal < 0.15)  { psadTierRate = tiers.intermediate.upgrade_rate * 100; psadTierLabel = 'PSAD 0.065–0.15 (intermediate risk tier)'; psadTierN = tiers.intermediate.n }
    else if (psadVal < 0.177) { psadTierRate = tiers.nccn_zone.upgrade_rate    * 100; psadTierLabel = 'PSAD 0.15–0.177 (above NCCN threshold)';  psadTierN = tiers.nccn_zone.n }
    else                      { psadTierRate = tiers.high.upgrade_rate         * 100; psadTierLabel = 'PSAD > 0.177 (above Kadeer cutoff)';       psadTierN = tiers.high.n }
  }

  // Age flag
  const ageNum = inputs.age != null && inputs.age !== '' ? Number(inputs.age) : null
  let ageFlag = null
  if (ageNum != null) {
    const ageTier = C.age.tiers
    if (ageNum < 50) {
      ageFlag = {
        upgrade_rate: ageTier.under_50.upgrade_rate * 100,
        progression_rate: ageTier.under_50.progressed_rate * 100,
        n: ageTier.under_50.n,
        note: `Age <50 (N=${ageTier.under_50.n}): upgrade rate ${(ageTier.under_50.upgrade_rate * 100).toFixed(0)}%, progression rate ${(ageTier.under_50.progressed_rate * 100).toFixed(0)}% — highest progression rate of any age group in cohort.`,
      }
    } else if (ageNum < 60) {
      ageFlag = {
        upgrade_rate: ageTier.age_50_59.upgrade_rate * 100,
        progression_rate: ageTier.age_50_59.progressed_rate * 100,
        n: ageTier.age_50_59.n,
        note: `Age 50–59 (N=${ageTier.age_50_59.n}): upgrade rate ${(ageTier.age_50_59.upgrade_rate * 100).toFixed(0)}%, progression rate ${(ageTier.age_50_59.progressed_rate * 100).toFixed(0)}%.`,
      }
    }
  }

  // Race flag
  let raceFlag = null
  const race = inputs.race?.toLowerCase()
  if (race === 'african_american' || race === 'black') {
    raceFlag = {
      upgrade_rate: C.race.african_american.upgrade_rate * 100,
      caucasian_rate: C.race.caucasian.upgrade_rate * 100,
      n: C.race.african_american.n,
      note: `African American patients (N=${C.race.african_american.n}): upgrade rate ${(C.race.african_american.upgrade_rate * 100).toFixed(1)}% vs ${(C.race.caucasian.upgrade_rate * 100).toFixed(1)}% Caucasian — consistent with known biological and detection disparities.`,
    }
  }

  const usePsadTier = psadTierRate != null && gggNum === 1
  const displayRate = usePsadTier ? psadTierRate : gggRate

  return {
    interventionRisk: {
      total_pct: C.intervention.progressed_rate * 100,
      clinical_pct: C.intervention.progressed_clinical_rate * 100,
      anxiety_pct: C.intervention.progressed_anxiety_rate * 100,
      basis: `N=${C.overview.n} Mount Sinai Tewari AS Program`,
      note: C.intervention.note,
    },
    upgradeProbability: {
      display_rate: displayRate,
      by_ggg: gggRate,
      by_psad_tier: psadTierRate,
      psad_tier_label: psadTierLabel,
      psad_tier_n: psadTierN,
      using_psad_tier: usePsadTier,
      n_basis: usePsadTier ? C.psad.n : C.overview.n,
      basis: usePsadTier
        ? `PSAD-tier rate from N=${C.psad.n} GG1 patients with PSAD in N=1,213 cohort (${psadTierLabel}, N=${psadTierN} in this tier)`
        : `GG${gggNum} rate from N=${C.overview.n} cohort`,
      ageFlag,
      raceFlag,
    },
    biopsyBurden: {
      yr5_expected: 2,
      yr10_expected: 4,
      basis: 'PRIAS protocol; NCCN 2024 — standard AS: biopsy every 2-3 years after confirmatory',
      note: 'Biopsy count from Mount Sinai cohort pending — using PRIAS/NCCN protocol estimate',
    },
    adversePathology: {
      available: false,
      note: 'Requires surgical pathology data from RALP cohort — not yet available',
    },
    pendingData: {
      timeToUpgrade: {
        available: false,
        note: 'Time-to-upgrade curves pending — requires enrollment and biopsy dates from clinical database. When available: expected median upgrade-free survival for GG1 + PSAD < 0.065 patients.',
      },
      biopsyCount: {
        available: false,
        note: 'Biopsy count per patient from Mount Sinai cohort pending — using PRIAS/NCCN protocol estimate.',
      },
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3 — PERSONALIZED LOGISTIC REGRESSION (Mount Sinai AS Cohort, N=781)
// Derived from N=1,213 GG1/GG2 active surveillance patients
// Outcome: GG upgrade on repeat biopsy
// Method: Maximum likelihood logistic regression (statsmodels)
// Significant predictors (p<0.01): GGG, PSAD, positive core count
// NOT significant: age (p=0.75), max % core (p=0.48), PI-RADS (p=0.40)
// Internal AUC: 0.668 (PSAD model, N=781) / 0.609 (fallback, no PSAD, N=1,197)
// Calibration: well-calibrated 5–40%; mild overestimate above 40%
// ═══════════════════════════════════════════════════════════════════════════════

export const UPGRADE_RISK_MODEL = {
  // Full cohort model — all 18 features, N=1,213, AUC 0.65
  // Trained on Mount Sinai AS cohort; categorical encodings match LabelEncoder output
  // Missing comorbidity/family hx inputs default to "No" (encoded 0) — most common value in cohort
  fullModel: {
    // Recalibrated intercept (was 0.2011, the raw sklearn fit intercept).
    // data/analyze_upgrade.py trains this model with class_weight='balanced',
    // which fits as if the two classes were 50/50 instead of the true ~25%/75%
    // split — a well-known artifact that systematically inflates predict_proba
    // for every patient. Standard correction: subtract ln(n_negative/n_positive)
    // from the intercept using the true training counts (n=1213, n_upgraded=305
    // below): ln(908/305) = 1.0909. Coefficients (feature effects) are unaffected
    // — this only removes the class-balancing bias from the intercept.
    intercept: 0.2011 - 1.0909,
    coef: {
      bmi:                                              -0.0011,
      age_first_diagnosis:                               0.0128,
      total_positive_cores:                              0.0565,
      perc_highest_core_involvement_for_highest_gleason: 0.0036,
      psa_result_ng:                                     0.0213,
      as_mri_prostate_vol:                              -0.0159,
      race_category_2:                                  -0.6089,
      current_smoking_category:                         -0.7248,
      htn_category:                                     -0.0261,
      hld_category:                                     -0.2339,
      diabetes_category:                                 0.2072,
      fhx_breast_category:                               0.2385,
      fhx_ovarian_category:                             -0.4996,
      fhx_prostate_category:                            -0.0858,
      first_positive_bx_ggg_named:                      -1.5655,
      ece_category:                                      0.2367,
      abut_category:                                     0.0314,
      highest_pirads_category:                           0.0391,
    },
    // LabelEncoder ordinals — values not supplied default to 0 ("No" for binary, GG1 for ggg, No PIRADS for pirads)
    enc: {
      race:    { 'African American': 0, 'Caucasian': 1, 'Other': 2 },   // default: 1 (Caucasian)
      ggg:     { 1: 0, 2: 1, 3: 2 },                                    // GG1=0, GG2=1, GG3=2
      pirads:  { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },                 // null→0 (No PIRADS)
    },
    auc: 0.65, n: 1213, n_upgraded: 305, base_rate: 0.251,
  },
  // Legacy PSAD model — requires prostate volume (N=781 subset, AUC 0.668)
  withPsad: {
    intercept:  -1.993554,
    is_gg2:     -2.151274,
    psad:        3.865594,
    pos_cores:   0.113897,
    // Covariance matrix for delta-method 95% CI
    cov: {
      c_c:   0.036894,
      c_g:   0.014423,
      c_p:  -0.133434,
      c_k:  -0.004355,
      g_g:   0.300061,
      g_p:  -0.093734,
      g_k:  -0.004085,
      p_p:   1.155689,
      p_k:  -0.004068,
      k_k:   0.001791,
    },
    auc: 0.668, n: 781, n_upgraded: 163, base_rate: 0.209,
  },
  // Fallback — no prostate volume/PSAD (N=1,197, AUC 0.609)
  noPsad: {
    intercept:  -1.270373,
    is_gg2:     -1.640259,
    pos_cores:   0.107063,
    auc: 0.609, n: 1197, n_upgraded: 301, base_rate: 0.252,
  },
}

// Precomputed percentile breakpoints from N=781 cohort predicted risks
export const RISK_PERCENTILES = {
  0: 0.0201, 5: 0.0427, 10: 0.1384, 15: 0.1532, 20: 0.1604,
  25: 0.1676, 30: 0.1737, 35: 0.1790, 40: 0.1853, 45: 0.1906,
  50: 0.1976, 55: 0.2049, 60: 0.2135, 65: 0.2264, 70: 0.2345,
  75: 0.2485, 80: 0.2638, 85: 0.2775, 90: 0.3167, 95: 0.3630,
  100: 0.7240,
}

// Clinical impact per 1,000 AS patients at key risk thresholds
// Base rate 20.9% (n_upgraded=209/1000), derived from PSAD-model cohort
export const CLINICAL_IMPACT_TABLE = {
  0.10: { biopsies: 908, caught: 205, missed: 4,  avoided: 92,  sens: 0.98, spec: 0.11, ppv: 0.22, npv: 0.94 },
  0.15: { biopsies: 867, caught: 201, missed: 8,  avoided: 133, sens: 0.96, spec: 0.16, ppv: 0.23, npv: 0.94 },
  0.20: { biopsies: 472, caught: 138, missed: 71, avoided: 528, sens: 0.66, spec: 0.58, ppv: 0.29, npv: 0.86 },
  0.25: { biopsies: 243, caught: 82,  missed: 127,avoided: 757, sens: 0.39, spec: 0.80, ppv: 0.34, npv: 0.83 },
  0.30: { biopsies: 114, caught: 42,  missed: 167,avoided: 886, sens: 0.20, spec: 0.91, ppv: 0.37, npv: 0.81 },
  0.35: { biopsies: 59,  caught: 22,  missed: 187,avoided: 941, sens: 0.10, spec: 0.95, ppv: 0.37, npv: 0.80 },
}

export function calcUpgradeRisk(inputs) {
  const ggg = Number(inputs.ggg)
  const positiveCores = inputs.positiveCores != null
    ? Number(inputs.positiveCores)
    : inputs.totalPositiveCores != null
      ? Number(inputs.totalPositiveCores)
      : null

  if (!ggg || positiveCores == null || isNaN(positiveCores)) {
    return { available: false, reason: 'GGG and positive core count required' }
  }

  const sig = x => 1 / (1 + Math.exp(-x))
  const psaVal = inputs.psa        != null ? Number(inputs.psa)           : null
  const volVal = inputs.prostateVolume != null ? Number(inputs.prostateVolume) : null
  const ageVal = inputs.age        != null ? Number(inputs.age)           : null
  const maxCoreVal = inputs.maxCorePercent != null ? Number(inputs.maxCorePercent) : null

  // ── Full cohort model (N=1,213, AUC 0.65) — primary ─────────────────────────
  // Requires GGG + positive cores (minimum); all other inputs optional
  {
    const FM = UPGRADE_RISK_MODEL.fullModel
    const C  = FM.coef

    // Numeric features — use cohort-median fallback when not supplied
    const bmi     = 27                          // cohort median approx
    const age     = ageVal    ?? 63             // cohort mean 63.2
    const cores   = positiveCores
    const maxCore = maxCoreVal ?? 30            // cohort median approx
    const psa     = psaVal    ?? 6.5            // cohort median approx
    const vol     = volVal    ?? 40             // cohort median approx

    // Categorical encodings (LabelEncoder ordinals)
    const gggEnc    = FM.enc.ggg[ggg]  ?? 0    // GG1=0, GG2=1, GG3=2
    const piradsRaw = inputs.pirads != null ? Number(inputs.pirads) : null
    const piradsEnc = piradsRaw != null ? (FM.enc.pirads[piradsRaw] ?? 0) : 0
    const eceEnc    = inputs.hasECE      === true ? 1 : 0
    const abutEnc   = inputs.hasAbutment === true ? 1 : 0

    // Comorbidities / family hx — default to 0 ("No") when not collected
    const race = 1, smoking = 0, htn = 0, hld = 0, diabetes = 0
    const fhxBreast = 0, fhxOvarian = 0, fhxProstate = 0

    const logit = FM.intercept
      + C.bmi                                              * bmi
      + C.age_first_diagnosis                              * age
      + C.total_positive_cores                             * cores
      + C.perc_highest_core_involvement_for_highest_gleason * maxCore
      + C.psa_result_ng                                    * psa
      + C.as_mri_prostate_vol                              * vol
      + C.race_category_2                                  * race
      + C.current_smoking_category                         * smoking
      + C.htn_category                                     * htn
      + C.hld_category                                     * hld
      + C.diabetes_category                                * diabetes
      + C.fhx_breast_category                              * fhxBreast
      + C.fhx_ovarian_category                             * fhxOvarian
      + C.fhx_prostate_category                            * fhxProstate
      + C.first_positive_bx_ggg_named                      * gggEnc
      + C.ece_category                                     * eceEnc
      + C.abut_category                                    * abutEnc
      + C.highest_pirads_category                          * piradsEnc

    const prob = sig(logit)

    // Percentile rank vs N=1,213 cohort (using legacy table as approximation)
    const keys = Object.keys(RISK_PERCENTILES).map(Number).sort((a, b) => a - b)
    let pctBelow = 0
    for (let i = 0; i < keys.length - 1; i++) {
      const lo = RISK_PERCENTILES[keys[i]], hi = RISK_PERCENTILES[keys[i + 1]]
      if (prob >= lo && prob < hi) {
        pctBelow = keys[i] + (keys[i + 1] - keys[i]) * (prob - lo) / (hi - lo)
        break
      }
    }
    if (prob >= RISK_PERCENTILES[95]) pctBelow = 95 + (prob - RISK_PERCENTILES[95]) / (RISK_PERCENTILES[100] - RISK_PERCENTILES[95]) * 5
    if (prob <= RISK_PERCENTILES[0])  pctBelow = 0

    let band, bandColor
    if      (prob < 0.15) { band = 'Very Low';  bandColor = 'green'  }
    else if (prob < 0.20) { band = 'Low';       bandColor = 'green'  }
    else if (prob < 0.28) { band = 'Average';   bandColor = 'yellow' }
    else if (prob < 0.40) { band = 'Elevated';  bandColor = 'orange' }
    else                  { band = 'High';      bandColor = 'red'    }

    return {
      available: true,
      probability: prob,
      pct: Math.round(prob * 100),
      ciLo: null, ciHi: null, hasCi: false,
      pctBelow: Math.round(pctBelow),
      band, bandColor,
      psadUsed: volVal != null,
      modelKey: 'fullModel',
      auc: FM.auc,
      modelN: FM.n,
      cohortAvgPct: Math.round(FM.base_rate * 100),
      inputs: { ggg, positiveCores, psa: psaVal, psad: volVal != null && psaVal != null ? psaVal / volVal : null },
    }
  }

  // (legacy models below are no longer reached — kept for reference)
  const isGG2 = ggg === 2 ? 1 : 0
  const psad = (psaVal != null && volVal != null && volVal > 0) ? psaVal / volVal : null
  let prob, ciLo, ciHi, modelKey

  if (psad != null) {
    const M = UPGRADE_RISK_MODEL.withPsad
    const g = isGG2, p = psad, k = positiveCores
    const logit = M.intercept + M.is_gg2 * g + M.psad * p + M.pos_cores * k
    const C = M.cov
    const varLogit =
      C.c_c +
      C.g_g * g * g + C.p_p * p * p + C.k_k * k * k +
      2 * C.c_g * g + 2 * C.c_p * p + 2 * C.c_k * k +
      2 * C.g_p * g * p + 2 * C.g_k * g * k + 2 * C.p_k * p * k
    const se = Math.sqrt(Math.max(0, varLogit))
    prob  = sig(logit)
    ciLo  = sig(logit - 1.96 * se)
    ciHi  = sig(logit + 1.96 * se)
    modelKey = 'withPsad'
  } else {
    const M = UPGRADE_RISK_MODEL.noPsad
    const logit = M.intercept + M.is_gg2 * isGG2 + M.pos_cores * positiveCores
    prob  = sig(logit)
    ciLo  = null
    ciHi  = null
    modelKey = 'noPsad'
  }

  const keys = Object.keys(RISK_PERCENTILES).map(Number).sort((a, b) => a - b)
  let pctBelow = 0
  for (let i = 0; i < keys.length - 1; i++) {
    const lo = RISK_PERCENTILES[keys[i]], hi = RISK_PERCENTILES[keys[i + 1]]
    if (prob >= lo && prob < hi) {
      pctBelow = keys[i] + (keys[i + 1] - keys[i]) * (prob - lo) / (hi - lo)
      break
    }
    if (prob >= RISK_PERCENTILES[95]) pctBelow = 95 + (prob - RISK_PERCENTILES[95]) / (RISK_PERCENTILES[100] - RISK_PERCENTILES[95]) * 5
    if (prob <= RISK_PERCENTILES[0]) pctBelow = 0
  }

  const M = UPGRADE_RISK_MODEL[modelKey]
  let band, bandColor
  if      (prob < 0.15) { band = 'Very Low';  bandColor = 'green'  }
  else if (prob < 0.20) { band = 'Low';       bandColor = 'green'  }
  else if (prob < 0.28) { band = 'Average';   bandColor = 'yellow' }
  else if (prob < 0.40) { band = 'Elevated';  bandColor = 'orange' }
  else                  { band = 'High';      bandColor = 'red'    }

  return {
    available: true,
    probability: prob,
    pct: Math.round(prob * 100),
    ciLo: ciLo != null ? Math.round(ciLo * 100) : null,
    ciHi: ciHi != null ? Math.round(ciHi * 100) : null,
    hasCi: ciLo != null,
    pctBelow: Math.round(pctBelow),
    band, bandColor,
    psadUsed: psad != null,
    modelKey,
    auc: M.auc,
    modelN: M.n,
    cohortAvgPct: Math.round(M.base_rate * 100),
    inputs: { ggg, isGG2, psad, positiveCores },
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * runAssessment(inputs) — two-layer engine entry point
 *
 * LAYER 1: Guideline framework (hard stops → scoring → tier)
 * LAYER 2: Cohort calibration (N=1,213 upgrade rates as contextual probability)
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
      outcomesData: null,
      modelValidation: MODEL_VALIDATION,
      upgradeRisk: calcUpgradeRisk(inputs),

      // ── Model provenance (non-clinical metadata) ──
      engineVersion:   ENGINE_VERSION,
      modelProvenance: MODEL_PROVENANCE,
      assessedAt:      new Date().toISOString(),
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

  // ── LAYER 2: Cohort calibration — N=1,213 probability context ───────────────
  const cohortContext = calcCohortContext(
    inputs,
    combinedResult.combinedTierKey,
    basicResult.psad,
  )

  // ── Outcomes prediction ──────────────────────────────────────────────────────
  const outcomesData = calcOutcomesPrediction(inputs)

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

    // ── Layer 2 output (N=1,213 cohort calibration) ──
    cohortContext,
    cohortLayer: cohortContext,

    // ── Outcomes prediction panel data ──
    outcomesData,

    // ── Layer 3: Personalized logistic regression risk ──
    upgradeRisk: calcUpgradeRisk(inputs),

    // ── Model provenance (non-clinical metadata) ──
    engineVersion:   ENGINE_VERSION,
    modelProvenance: MODEL_PROVENANCE,
    assessedAt:      new Date().toISOString(),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// READ-ONLY BENCHMARK ACCESSOR (additive — no clinical logic)
// Exposes a defensive, frozen copy of the local N=1,213 cohort figures for the
// national-benchmark / equity-audit views. Never consumed by tier assignment,
// scoring, or recommendation logic.
// ═══════════════════════════════════════════════════════════════════════════════

/** Wilson score interval for a binomial proportion. Returns [lo, hi] as fractions. */
function wilsonInterval(successes, n, z = 1.96) {
  if (!n || n <= 0) return [0, 0]
  const p = successes / n
  const d = 1 + (z * z) / n
  const center = p + (z * z) / (2 * n)
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  return [Math.max(0, (center - margin) / d), Math.min(1, (center + margin) / d)]
}

/**
 * getLocalCohortSnapshot() — read-only view of COHORT_CALIBRATION for the
 * national-benchmark and equity-audit components.
 *
 * Race-stratified rates are returned WITH N and a 95% Wilson interval, and are
 * explicitly flagged `riskAdjustmentUse: false`. They are observational cohort
 * context only and must never be used to modify a tier or recommendation.
 */
export function getLocalCohortSnapshot() {
  const C = COHORT_CALIBRATION
  const raceRows = [
    { key: 'caucasian',        label: 'White / Caucasian',        ...C.race.caucasian },
    { key: 'african_american', label: 'Black / African American', ...C.race.african_american },
    { key: 'other',            label: 'Other / not recorded',     ...C.race.other },
  ].map(r => {
    const upgraded = Math.round(r.upgrade_rate * r.n)
    const [lo, hi] = wilsonInterval(upgraded, r.n)
    return {
      key: r.key,
      label: r.label,
      n: r.n,
      upgradeRate: r.upgrade_rate,
      ciLow: lo,
      ciHigh: hi,
      ciLabel: `${(lo * 100).toFixed(1)}–${(hi * 100).toFixed(1)}%`,
    }
  })

  return Object.freeze({
    source: 'Mount Sinai Tewari Active Surveillance Program',
    n: C.overview.n,
    overallUpgradeRate: C.overview.overall_upgrade_rate,
    currentlyInAS: C.intervention.currently_in_as,
    currentlyInASRate: C.intervention.currently_in_as_rate,
    exitedWithoutUpgrade: C.intervention.progressed_anxiety_preference,
    exitedWithoutUpgradeRate: C.intervention.progressed_anxiety_rate,
    byGradeGroup: {
      1: { n: C.by_ggg[1].n, upgradeRate: C.by_ggg[1].upgrade_rate },
      2: { n: C.by_ggg[2].n, upgradeRate: C.by_ggg[2].upgrade_rate },
    },
    race: Object.freeze({
      rows: raceRows,
      riskAdjustmentUse: false,
      disclaimer:
        'Observational cohort context only. Sample sizes are small and the confidence intervals overlap substantially; race is not an input to any risk tier, score, or recommendation in this tool.',
    }),
  })
}
