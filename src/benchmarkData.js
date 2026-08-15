/**
 * benchmarkData.js — National active-surveillance benchmark data
 *
 * Single source of truth for every externally-published number rendered by
 * CohortBenchmark.js and EquityAudit.js. Nothing in this file is derived,
 * modelled, or estimated: each value is transcribed from the citation below.
 * If a number is not in the paper, it does not belong in this file.
 *
 * NOT a clinical model. These are descriptive population statistics about how
 * often active surveillance was *offered/used*, not about how a given patient's
 * disease will behave. Nothing here feeds risk tiering or recommendations.
 */

export const VA_BENCHMARK_CITATION = {
  authors:
    'Lee G, Bihn JR, Culnan JM, La J, Do NV, Myrie K, Paller CJ, Fillmore NR, Cooperberg MR; PROFOUND-VET Investigators',
  title: 'Active Surveillance Use for Favorable-Risk Prostate Cancer in a Veterans Affairs Population',
  journal: 'JAMA',
  type: 'Research letter',
  published: 'Published online August 13, 2026',
  doi: '10.1001/jama.2026.13471',
  short: 'Lee et al., JAMA 2026 (PROFOUND-VET). doi:10.1001/jama.2026.13471',
}

export const VA_COHORT = {
  n_eligible: 73042,
  n_initial_as_or_ww: 38130,
  diagnosis_years: '2005–2024',
  setting: 'National Veterans Affairs Healthcare System',
  median_age: 65,
  age_iqr: '60–69',
  citation: VA_BENCHMARK_CITATION.short,
  note:
    'Retrospective national VA cohort. Initial management captured as active surveillance or watchful waiting; the two could not be consistently separated.',
}

/**
 * AS uptake trajectory, first year vs most recent year of the study window.
 * Only the two endpoints are published; no intermediate years are asserted.
 */
export const VA_AS_TRAJECTORY = [
  {
    key: 'low_risk',
    label: 'Low-risk disease',
    startYear: 2005,
    startPct: 27,
    endYear: 2024,
    endPct: 93,
    citation: VA_BENCHMARK_CITATION.short,
  },
  {
    key: 'favorable_intermediate',
    label: 'Favorable intermediate-risk',
    startYear: 2005,
    startPct: 14,
    endYear: 2024,
    endPct: 61,
    citation: VA_BENCHMARK_CITATION.short,
  },
  {
    key: 'gg2_psa_under_10',
    label: 'PSA <10 ng/mL with GG2 in <50% of cores',
    startYear: 2005,
    startPct: 11,
    endYear: 2024,
    endPct: 55,
    subset: true,
    citation: VA_BENCHMARK_CITATION.short,
  },
  {
    key: 'gg1_psa_10_20',
    label: 'GG1 with PSA 10–20 ng/mL',
    startYear: 2005,
    startPct: 27,
    endYear: 2024,
    endPct: 88,
    subset: true,
    citation: VA_BENCHMARK_CITATION.short,
  },
]

/** Between-facility variation — the actionable spread. */
export const VA_FACILITY_VARIATION = {
  overall: {
    label: 'Overall surveillance rate across individual VA facilities',
    minPct: 23,
    maxPct: 93,
    citation: VA_BENCHMARK_CITATION.short,
  },
  gg1_2015_2024: {
    label: 'GG1 diagnosed 2015–2024',
    minPct: 60,
    maxPct: 100,
    outlierPct: 26,
    outlierNote: 'One outlier facility at 26%; all other facilities fell in the 60%–100% range.',
    citation: VA_BENCHMARK_CITATION.short,
  },
  note:
    'Same national system, same guidelines, same era — a roughly fourfold spread in how often surveillance was used. Variation of this size is a practice-pattern signal, not a case-mix signal.',
}

/**
 * Multivariable logistic regression — adjusted odds of *active surveillance
 * use*, i.e. of the management decision, adjusted for the other listed
 * covariates. These are NOT odds of upgrading, progression, or any outcome.
 */
export const VA_ADJUSTED_ORS = [
  {
    key: 'age',
    label: 'Increasing age',
    unit: 'per decade',
    or: 1.43,
    ciLow: 1.39,
    ciHigh: 1.47,
    p: 'P<.001',
    direction: 'more',
    domain: 'demographic',
  },
  {
    key: 'year',
    label: 'More recent diagnosis year',
    unit: 'per year',
    or: 1.21,
    ciLow: 1.21,
    ciHigh: 1.22,
    p: 'P<.001',
    direction: 'more',
    domain: 'temporal',
  },
  {
    key: 'black_race',
    label: 'Black or African American race (vs White)',
    unit: '',
    or: 0.95,
    ciLow: 0.90,
    ciHigh: 0.99,
    p: 'P<.001',
    direction: 'less',
    domain: 'equity',
  },
  {
    key: 'hispanic_ethnicity',
    label: 'Hispanic or Latino ethnicity (vs non-Hispanic)',
    unit: '',
    or: 0.85,
    ciLow: 0.76,
    ciHigh: 0.95,
    p: 'P=.003',
    direction: 'less',
    domain: 'equity',
  },
  {
    key: 'adi',
    label: 'Area Deprivation Index score',
    unit: 'per quartile',
    or: 0.97,
    ciLow: 0.95,
    ciHigh: 0.99,
    p: null,
    direction: 'less',
    domain: 'equity',
  },
  {
    key: 'gg2_vs_gg1',
    label: 'Grade Group 2 (vs Grade Group 1)',
    unit: '',
    or: 0.13,
    ciLow: 0.12,
    ciHigh: 0.13,
    p: 'P<.001',
    direction: 'less',
    domain: 'clinical',
  },
  {
    key: 'positive_cores',
    label: 'Greater percentage of positive-result biopsy cores',
    unit: 'per decile',
    or: 0.88,
    ciLow: 0.87,
    ciHigh: 0.89,
    p: 'P<.001',
    direction: 'less',
    domain: 'clinical',
  },
].map(row => ({ ...row, citation: VA_BENCHMARK_CITATION.short }))

export const VA_NULL_FINDINGS = [
  {
    key: 'travel_distance',
    label: 'Travel distance to care',
    finding: 'Not associated with active surveillance use.',
    citation: VA_BENCHMARK_CITATION.short,
  },
]

export const VA_LIMITATIONS = [
  'Relies on electronic health record data that may be incomplete, particularly for stage.',
  'Active surveillance could not be consistently separated from watchful waiting.',
  'Eligibility criteria used in the study do not exactly align with NCCN risk groups.',
  'VA is an integrated, largely equal-access system; uptake here may represent a best case relative to US community practice.',
]

/** Lookup helper — keeps components from hard-coding numbers inline. */
export function getAdjustedOR(key) {
  return VA_ADJUSTED_ORS.find(row => row.key === key) || null
}

export function formatOR(row) {
  if (!row) return '—'
  return `OR ${row.or.toFixed(2)} (95% CI ${row.ciLow.toFixed(2)}–${row.ciHigh.toFixed(2)})`
}

/**
 * Converts an adjusted OR into a plain-language relative-odds statement.
 * Descriptive only — never used to alter a recommendation.
 */
export function orToPlainLanguage(row) {
  if (!row) return ''
  if (row.or >= 1) {
    const pct = Math.round((row.or - 1) * 100)
    return `${pct}% higher adjusted odds of being managed with surveillance`
  }
  const pct = Math.round((1 - row.or) * 100)
  return `${pct}% lower adjusted odds of being managed with surveillance`
}
