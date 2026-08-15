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
export const ENGINE_VERSION = '1.0.0'

/**
 * Cohort backing LAYER 2 (COHORT_CALIBRATION / MODEL_VALIDATION in asEngine.js).
 * N and upgrade counts are taken from the values already encoded in the engine.
 */
export const COHORT = {
  name: 'Mount Sinai Tewari Active Surveillance Program',
  n: 1213,
  upgradeEvents: 305,
  validationType: 'Internal cohort validation (retrospective)',
  reference: 'Kadeer N et al., Eur Urol 2025',
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
  { body: 'AUA/ASTRO', edition: 'Clinically Localized Prostate Cancer Guideline 2022' },
  { body: 'NCCN',      edition: 'Prostate Cancer Version 3.2024' },
  { body: 'EAU',       edition: 'EAU-EANM-ESTRO-ESUR-SIOG Guidelines 2024' },
]

/** Additional non-guideline evidence sources cited by the engine. */
export const EVIDENCE_SOURCES = [
  'PRIAS protocol',
  "D'Amico AV et al., JAMA 2004",
  'Bastian PJ et al., 2004',
  'Kadeer N et al., Eur Urol 2025',
]

/**
 * Append-only changelog. Newest first. Each entry documents what changed in the
 * clinical engine or its provenance metadata.
 * `date` is null where the calendar date of the change is not recoverable from
 * the repo — see TODO above; git history remains the authoritative record.
 */
export const CHANGELOG = [
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
