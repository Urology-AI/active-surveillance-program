/**
 * CohortBenchmark — national AS-uptake benchmark view.
 *
 * Places a practice's own active-surveillance uptake against the national
 * Veterans Affairs trajectory published in Lee et al., JAMA 2026
 * (PROFOUND-VET), and makes the between-facility spread (23%–93%) legible.
 *
 * Standalone and self-contained: pass optional practice rates, or leave them
 * blank and the user can enter them. Renders benchmark-only if nothing given.
 *
 * NOT a patient-level tool. Nothing here produces or modifies a clinical
 * recommendation; it describes how often surveillance is *offered*.
 */
import React, { useState } from 'react'
import {
  VA_BENCHMARK_CITATION,
  VA_COHORT,
  VA_AS_TRAJECTORY,
  VA_FACILITY_VARIATION,
  VA_LIMITATIONS,
  getAdjustedOR,
  formatOR,
} from '../benchmarkData'
import { getLocalCohortSnapshot } from '../asEngine'

const e = React.createElement

const pct = v => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v))

// ─── Small building blocks ────────────────────────────────────────────────────

function SectionTitle({ children, sub }) {
  return e('div', { className: 'mb-3' },
    e('h3', { className: 'text-base font-bold text-sinai-navy' }, children),
    sub && e('p', { className: 'text-xs text-slate-500 mt-0.5' }, sub)
  )
}

function Citation({ compact }) {
  return e('p', { className: `text-[11px] text-slate-400 leading-snug ${compact ? '' : 'mt-2'}` },
    compact ? VA_BENCHMARK_CITATION.short
      : `${VA_BENCHMARK_CITATION.authors}. ${VA_BENCHMARK_CITATION.title}. ${VA_BENCHMARK_CITATION.journal}. ${VA_BENCHMARK_CITATION.published}. doi:${VA_BENCHMARK_CITATION.doi}`
  )
}

/** Horizontal 0–100% track showing the 2005 → 2024 movement for one risk group. */
function TrajectoryBar({ row, practicePct }) {
  const start = row.startPct
  const end = row.endPct
  const mark = pct(practicePct)

  return e('div', { className: 'py-3 border-b border-slate-100 last:border-0' },
    e('div', { className: 'flex items-baseline justify-between mb-2 gap-3' },
      e('span', { className: `text-sm ${row.subset ? 'text-slate-500' : 'font-semibold text-slate-700'}` },
        (row.subset ? '↳ ' : '') + row.label),
      e('span', { className: 'text-xs font-mono text-slate-500 whitespace-nowrap' },
        `${start}% (${row.startYear}) → `,
        e('span', { className: 'font-bold text-sinai-cerulean' }, `${end}% (${row.endYear})`)
      )
    ),
    e('div', { className: 'relative h-6' },
      // track
      e('div', { className: 'absolute inset-x-0 top-2 h-2 rounded-full bg-slate-100' }),
      // growth span
      e('div', {
        className: 'absolute top-2 h-2 rounded-full bg-sinai-cerulean/70',
        style: { left: `${start}%`, width: `${Math.max(0, end - start)}%` },
      }),
      // start cap
      e('div', {
        className: 'absolute top-1 w-1 h-4 rounded bg-slate-400',
        style: { left: `${start}%` },
        title: `${row.startYear}: ${start}%`,
      }),
      // end cap
      e('div', {
        className: 'absolute top-0.5 w-1.5 h-5 rounded bg-sinai-navy',
        style: { left: `${end}%` },
        title: `${row.endYear}: ${end}%`,
      }),
      // practice marker
      mark !== null && e('div', {
        className: 'absolute -top-0.5 w-0.5 h-7 bg-sinai-magenta',
        style: { left: `${Math.min(100, Math.max(0, mark))}%` },
        title: `Your practice: ${mark}%`,
      })
    ),
    mark !== null && e('p', { className: 'text-xs mt-1 text-sinai-magenta font-semibold' },
      `Your practice ${mark}% — ${mark >= end ? `at or above the ${row.endYear} VA rate` : `${(end - mark).toFixed(0)} points below the ${row.endYear} VA rate`}`
    )
  )
}

/** The facility spread — the actionable point. */
function FacilitySpread({ practiceOverall }) {
  const o = VA_FACILITY_VARIATION.overall
  const g = VA_FACILITY_VARIATION.gg1_2015_2024
  const mark = pct(practiceOverall)

  const range = (min, max, colorClass) => e('div', { className: 'relative h-8 mb-1' },
    e('div', { className: 'absolute inset-x-0 top-3 h-2 rounded-full bg-slate-100' }),
    e('div', {
      className: `absolute top-3 h-2 rounded-full ${colorClass}`,
      style: { left: `${min}%`, width: `${max - min}%` },
    }),
    e('span', { className: 'absolute top-0 text-[10px] font-mono text-slate-500', style: { left: `${min}%` } }, `${min}%`),
    e('span', { className: 'absolute top-0 text-[10px] font-mono text-slate-500', style: { left: `${Math.min(max, 92)}%` } }, `${max}%`)
  )

  return e('div', { className: 'p-4 rounded-xl border border-sinai-navy/15 bg-white' },
    e(SectionTitle, {
      sub: 'Same system, same guidelines, same era. Where a patient was seen predicted management as much as the disease did.',
    }, 'Facility-level variation'),

    e('p', { className: 'text-xs font-semibold text-slate-500 mb-1' }, o.label),
    range(o.minPct, o.maxPct, 'bg-sinai-magenta/60'),
    mark !== null && e('div', { className: 'relative h-4 -mt-1 mb-2' },
      e('div', {
        className: 'absolute top-0 w-0.5 h-3 bg-sinai-navy',
        style: { left: `${Math.min(100, Math.max(0, mark))}%` },
      }),
      e('span', {
        className: 'absolute top-0 text-[10px] font-bold text-sinai-navy whitespace-nowrap',
        style: { left: `${Math.min(80, Math.max(0, mark)) + 1}%` },
      }, `your practice ${mark}%`)
    ),

    e('p', { className: 'text-xs font-semibold text-slate-500 mt-4 mb-1' }, g.label),
    range(g.minPct, g.maxPct, 'bg-sinai-cerulean/60'),
    e('p', { className: 'text-[11px] text-slate-500 mt-1' }, g.outlierNote),

    e('p', { className: 'text-xs text-slate-600 mt-4 leading-relaxed' }, VA_FACILITY_VARIATION.note),
    e(Citation, { compact: true })
  )
}

function LocalVsNational() {
  const local = getLocalCohortSnapshot()
  const gg2 = getAdjustedOR('gg2_vs_gg1')

  const cell = (label, value, note) => e('div', { className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
    e('p', { className: 'text-[11px] uppercase tracking-wide font-semibold text-slate-400' }, label),
    e('p', { className: 'text-lg font-bold text-sinai-navy mt-0.5' }, value),
    note && e('p', { className: 'text-[11px] text-slate-500 mt-0.5 leading-snug' }, note)
  )

  return e('div', { className: 'p-4 rounded-xl border border-slate-200 bg-white' },
    e(SectionTitle, { sub: 'Two different denominators — read them side by side, not as one number.' },
      'Local cohort vs national benchmark'),
    e('div', { className: 'grid grid-cols-2 gap-3' },
      cell('Mount Sinai Tewari AS Program', `N = ${local.n.toLocaleString()}`,
        `Patients already enrolled on surveillance. ${(local.overallUpgradeRate * 100).toFixed(1)}% upgraded on repeat biopsy.`),
      cell('National VA cohort', `N = ${VA_COHORT.n_eligible.toLocaleString()}`,
        `${VA_COHORT.n_initial_as_or_ww.toLocaleString()} initially managed with surveillance or watchful waiting, ${VA_COHORT.diagnosis_years}.`)
    ),
    e('p', { className: 'text-xs text-slate-600 mt-3 leading-relaxed' },
      'The local cohort measures what happens ',
      e('em', null, 'after'),
      ' surveillance begins; the VA cohort measures how often surveillance is chosen at all. The VA data speak to the decision, not the outcome — GG2 patients had ',
      e('span', { className: 'font-semibold' }, formatOR(gg2)),
      ' of being surveilled versus GG1, while locally GG2 enrollees upgraded at ',
      e('span', { className: 'font-semibold' }, `${(local.byGradeGroup[2].upgradeRate * 100).toFixed(1)}% (N=${local.byGradeGroup[2].n})`),
      ' — lower than the GG1 rate of ',
      `${(local.byGradeGroup[1].upgradeRate * 100).toFixed(1)}% (N=${local.byGradeGroup[1].n}).`
    ),
    e('p', { className: 'text-[11px] text-slate-400 mt-2' },
      'Local figures: Mount Sinai Tewari AS Program N=1,213 (subject to selection — the GG2 group is small and highly selected). National figures: ',
      VA_BENCHMARK_CITATION.short
    )
  )
}

function FIRGap() {
  const gg2 = getAdjustedOR('gg2_vs_gg1')
  const fir = VA_AS_TRAJECTORY.find(r => r.key === 'favorable_intermediate')
  const low = VA_AS_TRAJECTORY.find(r => r.key === 'low_risk')

  return e('div', { className: 'p-4 rounded-xl border-2 border-sinai-magenta/30 bg-sinai-magenta-light/40' },
    e(SectionTitle, { sub: 'The single most actionable finding for a tool that already handles FIR.' },
      'The favorable intermediate-risk gap'),
    e('div', { className: 'flex flex-wrap gap-6 mb-3' },
      e('div', null,
        e('p', { className: 'text-3xl font-bold text-sinai-magenta' }, `${gg2.or.toFixed(2)}`),
        e('p', { className: 'text-[11px] text-slate-600' },
          `adjusted OR, GG2 vs GG1 (95% CI ${gg2.ciLow.toFixed(2)}–${gg2.ciHigh.toFixed(2)}, ${gg2.p})`)
      ),
      e('div', null,
        e('p', { className: 'text-3xl font-bold text-sinai-navy' }, `${fir.endPct}%`),
        e('p', { className: 'text-[11px] text-slate-600' },
          `FIR surveillance use in ${fir.endYear}, up from ${fir.startPct}% in ${fir.startYear}`)
      ),
      e('div', null,
        e('p', { className: 'text-3xl font-bold text-sinai-cerulean' }, `${low.endPct}%`),
        e('p', { className: 'text-[11px] text-slate-600' }, `low-risk surveillance use in ${low.endYear}, for comparison`)
      )
    ),
    e('p', { className: 'text-sm text-slate-700 leading-relaxed' },
      'Adjusting for age, year, positive-core burden, and social factors, Grade Group 2 disease carried roughly one-eighth the odds of being managed with surveillance compared with Grade Group 1. Uptake in favorable intermediate-risk disease has risen substantially but still trails low-risk uptake by roughly 30 points, so a large share of guideline-eligible FIR patients are being steered directly to treatment.'
    ),
    e('p', { className: 'text-xs text-slate-600 mt-2 leading-relaxed' },
      'Audit prompt: of your GG2 patients meeting favorable intermediate-risk criteria in the last 12 months, in how many was surveillance documented as an offered option?'
    ),
    e(Citation, { compact: true })
  )
}

function Limitations() {
  return e('details', { className: 'rounded-xl border border-slate-200 bg-slate-50 p-4' },
    e('summary', { className: 'text-sm font-semibold text-slate-600 cursor-pointer' },
      'How to read this benchmark — source limitations'),
    e('ul', { className: 'mt-3 space-y-1.5 list-disc pl-5' },
      VA_LIMITATIONS.map((l, i) => e('li', { key: i, className: 'text-xs text-slate-600 leading-relaxed' }, l))
    ),
    e(Citation, {})
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {object} [props.practiceRates] optional pre-filled rates keyed by
 *        VA_AS_TRAJECTORY key, e.g. { low_risk: 88, favorable_intermediate: 40 }
 * @param {boolean} [props.editable=true] show the practice-rate entry fields
 */
export default function CohortBenchmark({ practiceRates, editable = true }) {
  const [rates, setRates] = useState(() => practiceRates || {})

  const field = row => e('div', { key: row.key, className: 'flex items-center gap-2' },
    e('label', { className: 'text-xs text-slate-600 flex-1' }, row.label),
    e('input', {
      type: 'number', min: '0', max: '100', step: '1',
      value: rates[row.key] === undefined ? '' : rates[row.key],
      placeholder: '—',
      onChange: ev => setRates(r => ({ ...r, [row.key]: ev.target.value })),
      className: 'w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-sinai-cerulean/40 bg-white',
    }),
    e('span', { className: 'text-xs text-slate-400 w-3' }, '%')
  )

  return e('div', { className: 'space-y-4' },

    e('div', { className: 'p-4 rounded-xl bg-sinai-navy text-white' },
      e('h2', { className: 'text-lg font-bold' }, 'National benchmark — active surveillance uptake'),
      e('p', { className: 'text-xs text-white/70 mt-1 leading-relaxed' },
        `${VA_COHORT.setting}. ${VA_COHORT.n_eligible.toLocaleString()} eligible patients diagnosed ${VA_COHORT.diagnosis_years}; median age ${VA_COHORT.median_age} (IQR ${VA_COHORT.age_iqr}). Figures below describe how often surveillance was used — not how any individual patient's disease will behave.`)
    ),

    editable && e('div', { className: 'p-4 rounded-xl border border-slate-200 bg-white' },
      e(SectionTitle, { sub: 'Optional. Enter your own uptake to place markers on the tracks below.' },
        'Your practice'),
      e('div', { className: 'space-y-2' }, VA_AS_TRAJECTORY.map(field))
    ),

    e('div', { className: 'p-4 rounded-xl border border-slate-200 bg-white' },
      e(SectionTitle, { sub: `Published endpoints only (${VA_AS_TRAJECTORY[0].startYear} and ${VA_AS_TRAJECTORY[0].endYear}); intermediate years are not shown because they were not reported.` },
        'VA surveillance trajectory'),
      VA_AS_TRAJECTORY.map(row => e(TrajectoryBar, { key: row.key, row, practicePct: rates[row.key] })),
      e(Citation, { compact: true })
    ),

    e(FIRGap, {}),
    e(FacilitySpread, { practiceOverall: rates.low_risk }),
    e(LocalVsNational, {}),
    e(Limitations, {})
  )
}

export { TrajectoryBar, FacilitySpread, FIRGap }
