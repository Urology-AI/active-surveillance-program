/**
 * modelVersion.js — single source of truth for model provenance.
 *
 * Regulatory context: this tool is being developed toward an FDA Software-as-a-
 * Medical-Device clinical decision support pathway. Model provenance (which
 * version of the algorithm produced a given recommendation, calibrated against
 * which data cut, encoding which guideline editions) is a prerequisite for both
 * internal retrospective validation and prospective clinical validation.
 *
 * RULES FOR THIS FILE
 *  · Every value here must be verifiable from the repo or from a documented
 *    source. Do NOT invent dates, cohort counts, or guideline editions.
 *  · Anything not verifiable is marked TODO below and left null — a null is
 *    honest, a guessed date is a regulatory finding.
 *  · Bump ENGINE_VERSION and add a CHANGELOG entry whenever clinical logic,
 *    thresholds, tier assignment, or cohort calibration data change.
 */

/**
 * Semantic version of the clinical engine (src/asEngine.js).
 *   MAJOR — tier assignment or hard-stop behaviour changes
 *   MINOR — new sub-model, new factor, new calibration data cut
 *   PATCH — wording, labels, non-clinical fixes
 *
 * 1.0.0 = the first explicitly versioned build of the two-layer engine
 * (guideline framework + N=1,213 cohort calibration) as it exists today.
 */
export const ENGINE_VERSION = '1.1.0'

/**
 * Cohort backing LAYER 2 (COHORT_CALIBRATION / MODEL_VALIDATION in asEngine.js).
 * N and upgrade counts are taken from the values already encoded in the engine.
 */
export const COHORT = {
  name: 'Mount Sinai Tewari Active Surveillance Program',
  n: 1213,
  upgradeEvents: 305,
  validationType: 'Internal cohort validation (retrospective)',
  reference: 'Kadeer A et al., Front Oncol 2025;15:1602134, doi:10.3389/fonc.2025.1602134',
  // TODO(provenance): the calendar date the N=1,213 extract was frozen is not
  // recorded anywhere in this repository. Populate with the actual data-cut
  // date from the Tewari program data dictionary before any regulatory
  // submission. Left null deliberately — do not guess.
  dataCutDate: null,
  dataCutStatus: 'TODO — data-cut date not recorded in repo; pending confirmation',
}

/**
 * Guideline editions the engine logic actually cites (verified by reading the
 * citation strings in src/asEngine.js — hard stops, sub-model thresholds and
 * monitoring feature sources). Nothing here is inferred.
 */
export const GUIDELINES = [
  { body: 'AUA/ASTRO', edition: 'Clinically Localized Prostate Cancer: AUA/ASTRO Guideline Amendment (2026), doi:10.1097/JU.0000000000005060 — amends the 2022 edition' },
  { body: 'NCCN',      edition: 'Prostate Cancer Version 3.2024' },
  { body: 'EAU',       edition: 'EAU-EANM-ESTRO-ESUR-SIOG Guidelines 2024' },
]

/** Additional non-guideline evidence sources cited by the engine. */
export const EVIDENCE_SOURCES = [
  'PRIAS protocol',
  "D'Amico AV et al., JAMA 2004",
  'Bastian PJ et al., 2004',
  'Kadeer A et al., Front Oncol 2025;15:1602134, doi:10.3389/fonc.2025.1602134',
]

/**
 * Append-only changelog. Newest first. Each entry documents what changed in the
 * clinical engine or its provenance metadata.
 * `date` is null where the calendar date of the change is not recoverable from
 * the repo — see TODO above; git history remains the authoritative record.
 */
export const CHANGELOG = [
  {
    version: '1.1.0',
    date: null, // TODO(provenance): stamp release date at tagged release
    summary:
      'Clinical-defect remediation across the engine (15 defects found by the ' +
      'golden-case regression suite). Scoring/threshold changes: PSAD "very ' +
      'low" band now ends at the cohort-derived Youden cutoff 0.065 instead of ' +
      'the unsourced 0.10 (patients at PSAD 0.065–0.10 score 0 rather than -5, ' +
      'the safer direction, and the score now agrees with the narrative and ' +
      'cohort tier shown beside it); core-burden ratio buckets use exact 1/3 ' +
      'and 1/2 rather than the literal 0.33; ConfirmMDx scores only ' +
      'explicitly-recognised results (unrecognised values were being scored as ' +
      'favourable negatives). Correctness/safety: every numeric input is now ' +
      'gated on Number.isFinite, closing a hole in which a non-numeric entry ' +
      'passed validation and fell through every comparison into the most ' +
      'favourable branch; family-history cohort context removed (referenced a ' +
      'non-existent data key and crashed every assessment that used it); ECE ' +
      'and NVB abutment are read from both the form and uploaded-JSON input ' +
      'conventions (previously always encoded 0); Layer 3 refuses to score ' +
      'GG4/GG5 (outside its GG1–GG3 training range) and is suppressed entirely ' +
      'on hard-stop results; race is documented as a deliberate non-input and ' +
      'the misleading live variable removed. Cohort data: age stratification ' +
      'denominator corrected from N=1,213 to its true GG1 subset N=1,111, with ' +
      'matching UI copy; treatment_discussion tier added to ' +
      'tier_annual_upgrade_risk with an explicitly null risk rather than no ' +
      'statement at all; PSAD tier lookup unified so a single screen cannot ' +
      'report two different upgrade rates. Progression engine: grade upgrades ' +
      'and high-PI-RADS / new-lesion MRI findings are evaluated over the full ' +
      'visit history rather than the latest visit only (a documented upgrade ' +
      'could previously be erased by a later benign biopsy); PSA velocity is a ' +
      'least-squares fit over all points, consistent with PSADT; corrupt ' +
      'roster storage is quarantined rather than silently overwritten; date ' +
      'and PSADT formatting no longer emit "Invalid Date" / "~NaN months" into ' +
      'clinical text; imported records are structurally validated.',
  },
  {
    version: '1.0.0',
    date: null, // TODO(provenance): stamp release date at first tagged release
    summary:
      'First versioned baseline. Two-layer engine: guideline framework ' +
      '(AUA 2022 / NCCN 3.2024 / EAU 2024 hard stops, four sub-models, combined ' +
      'tier) plus N=1,213 internal cohort calibration. Adds model provenance ' +
      'metadata to engine output and a local assessment audit log.',
  },
]

/** Compact, human-readable stamp for UI and exports. */
export const VERSION_STAMP =
  `AS Engine v${ENGINE_VERSION} · Cohort N=${COHORT.n}` +
  (COHORT.dataCutDate ? ` · Data cut ${COHORT.dataCutDate}` : ' · Data cut: pending')

/** Full provenance block embedded in engine results, exports and audit records. */
export const MODEL_PROVENANCE = {
  engineVersion:  ENGINE_VERSION,
  cohortName:     COHORT.name,
  cohortN:        COHORT.n,
  cohortDataCut:  COHORT.dataCutDate,
  cohortDataCutStatus: COHORT.dataCutStatus,
  validationType: COHORT.validationType,
  guidelines:     GUIDELINES,
  evidenceSources: EVIDENCE_SOURCES,
  versionStamp:   VERSION_STAMP,
}
